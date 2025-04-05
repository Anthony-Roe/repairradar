import psutil
import time
import win32serviceutil
import win32service
import win32event
import servicemanager
import logging
import threading
import os
from datetime import datetime

# Configure logging
logging.basicConfig(
    filename="C:\\ProcessMonitorService.log",
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

# Thresholds
CPU_THRESHOLD = 50.0
MEMORY_THRESHOLD = 500
CHECK_INTERVAL = 10
LOG_CLEAN_INTERVAL = 60  # Clean log every 60 seconds

# Whitelist of "usual unusual" processes (add more as needed)
USUAL_UNUSUAL = {
    "Code.exe", "msedge.exe", "Discord.exe", "OneDrive.exe",
    "PhoneExperienceHost.exe", "java.exe", "MsMpEng.exe"
}

class ProcessMonitorService(win32serviceutil.ServiceFramework):
    _svc_name_ = "ProcessMonitorService"
    _svc_display_name_ = "System Process Monitor Service"
    _svc_description_ = "Monitors processes and cleans usual unusual log entries."

    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.hWaitStop = win32event.CreateEvent(None, 0, 0, None)
        self.run = True
        self.first_scan = True
        self.last_process_list = set()
        # Start log cleaning thread
        self.clean_thread = threading.Thread(target=self.clean_log_file, daemon=True)
        self.clean_thread.start()

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        win32event.SetEvent(self.hWaitStop)
        self.run = False
        self.clean_thread.join(timeout=5)  # Wait for thread to finish

    def SvcDoRun(self):
        servicemanager.LogMsg(
            servicemanager.EVENTLOG_INFORMATION_TYPE,
            servicemanager.PYS_SERVICE_STARTED,
            (self._svc_name_, '')
        )
        self.main()

    def check_all_processes(self):
        current_processes = set()
        process_count = 0
        unusual_count = 0

        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_info', 'username', 'create_time']):
            process_count += 1
            try:
                name = proc.info['name'] or f"Unnamed_{proc.info['pid']}"
                pid = proc.info['pid']
                current_processes.add((pid, name))
                cpu_usage = proc.cpu_percent(interval=1.0)
                memory_usage = proc.memory_info().rss / 1024 / 1024
                user = proc.info['username'] or "N/A"
                create_time = datetime.fromtimestamp(proc.info['create_time']).strftime("%Y-%m-%d %H:%M:%S")

                # Log all processes for debugging
                if self.first_scan:  # Limit to first scan to avoid log spam
                    logging.info(
                        f"Process details - PID: {pid}, Name: {name}, "
                        f"CPU: {cpu_usage:.2f}%, Memory: {memory_usage:.2f} MB, User: {user}, Created: {create_time}"
                    )

                if cpu_usage > CPU_THRESHOLD or memory_usage > MEMORY_THRESHOLD:
                    unusual_count += 1
                    key = f"{pid}_{name}"
                    self.recurring_issues[key]["count"] += 1
                    self.recurring_issues[key]["cpu_total"] += cpu_usage
                    self.recurring_issues[key]["memory_total"] += memory_usage
                    self.recurring_issues[key]["user"] = user
                    self.recurring_issues[key]["created"] = create_time
                    logging.warning(
                        f"Unusual activity - PID: {pid}, Name: {name}, "
                        f"CPU: {cpu_usage:.2f}%, Memory: {memory_usage:.2f} MB, User: {user}, Created: {create_time}"
                    )

            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess, AttributeError) as e:
                logging.debug(f"Access issue - PID: {pid}, Name: {name}, Error: {str(e)}")
                continue
        # Rest of the method remains unchanged

    def clean_log_file(self):
        """Thread to periodically clean 'usual unusual' entries from the log."""
        while self.run:
            try:
                # Read the current log file
                log_file = "C:\\ProcessMonitorService.log"
                if not os.path.exists(log_file):
                    time.sleep(LOG_CLEAN_INTERVAL)
                    continue

                with open(log_file, "r") as f:
                    lines = f.readlines()

                # Filter out lines with whitelisted processes
                cleaned_lines = []
                for line in lines:
                    if "WARNING - Unusual activity" in line:
                        skip = False
                        for process in USUAL_UNUSUAL:
                            if f"Name: {process}" in line:
                                skip = True
                                break
                        if not skip:
                            cleaned_lines.append(line)
                    else:
                        cleaned_lines.append(line)

                # Write back the cleaned log
                with open(log_file, "w") as f:
                    f.writelines(cleaned_lines)

                logging.info("Log file cleaned of usual unusual entries.")
            except Exception as e:
                logging.error(f"Error cleaning log file: {str(e)}")

            time.sleep(LOG_CLEAN_INTERVAL)

    def main(self):
        logging.info("Service started. Monitoring all processes.")
        while self.run:
            self.check_all_processes()
            logging.info(f"Next scan in {CHECK_INTERVAL} seconds.")
            time.sleep(CHECK_INTERVAL)
        logging.info("Service stopped.")

if __name__ == "__main__":
    win32serviceutil.HandleCommandLine(ProcessMonitorService)