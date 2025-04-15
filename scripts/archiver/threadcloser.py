import signal
from tkinter.messagebox import askyesno
import psutil
import ctypes
import threading
import time
import os

import psutil
import pytest

from unittest.mock import patch, MagicMock
from psutil._common import STATUS_RUNNING

def check_sigterm_handling():
    current_handler = signal.getsignal(signal.SIGTERM)
    if current_handler == signal.SIG_IGN:
        print("SIGTERM is being ignored by this process")
    elif current_handler == signal.SIG_DFL:
        print("SIGTERM will terminate this process (default handler)")
    else:
        print("SIGTERM has a custom handler installed")

def is_windows_process(pid):
    """Check if a process is a native Windows process"""
    try:
        proc = psutil.Process(pid)
        
        # Method 1: Check executable path
        exe_path = proc.exe().lower()
        is_system_process = (
            exe_path.startswith('c:\\windows\\') or
            exe_path.startswith('c:\\program files\\') or
            exe_path.startswith('c:\\program files (x86)\\')
        )
        
        # Method 2: Check username (more reliable)
        username = proc.username()
        is_system_user = username.lower() in [
            'nt authority\\system',
            'local service',
            'network service'
        ]
        
        # Method 3: Check process name against known Windows processes
        process_name = proc.name().lower()
        common_windows_processes = {
            'svchost.exe', 'explorer.exe', 'wininit.exe',
            'csrss.exe', 'winlogon.exe', 'services.exe',
            'lsass.exe', 'smss.exe', 'dwm.exe'
        }
        
        return (is_system_process or 
                is_system_user or 
                process_name in common_windows_processes)
        
    except (psutil.NoSuchProcess, psutil.AccessDenied):
        return False

def close_orphaned_threads():
    for thread in psutil.process_iter():
        if not is_windows_process(thread.pid) and askyesno("Script", f"Close Thread: {thread.name()}"):
            while thread.is_running(['pid', 'name']):
                time.sleep(1)
                try:
                    if thread.is_running():
                        for subthread in thread.children():
                            if subthread.is_running():
                                subthread.kill()
                        thread.kill()
                except psutil.NoSuchProcess:
                    pass
                continue


@pytest.mark.parametrize(
    "test_id, parent_pid_exists, owner_pid_exists, expected_termination_call_count",
    [
        ("OrphanedThread_ShouldTerminate", False, False, 1),
        ("NonOrphanedThread_ParentExists_ShouldNotTerminate", True, True, 0),
        ("NonOrphanedThread_OwnerExists_ShouldNotTerminate", False, True, 0),
        ("CurrentProcessThread_ShouldNotTerminate", True, True, 0),
    ],
)
@patch("psutil.process_iter")
@patch("os.getpid")
@patch("psutil.pid_exists")
def test_close_orphaned_threads(
    mock_pid_exists,
    mock_getpid,
    mock_process_iter,
    test_id,
    parent_pid_exists,
    owner_pid_exists,
    expected_termination_call_count,
):

    # Arrange
    mock_process = MagicMock()
    mock_parent = MagicMock()

    mock_process.parent.return_value = mock_parent
    mock_process.terminate = MagicMock()

    mock_parent.pid = 123 if parent_pid_exists else None  # Simulate parent process existence
    mock_process.owner_pid = 456  # Simulate thread owner process ID
    mock_pid_exists.return_value = owner_pid_exists  # Simulate owner process existence check

    mock_getpid.return_value = os.getpid()
    mock_process_iter.return_value = [mock_process]

    # Act
    close_orphaned_threads()

    # Assert
    assert mock_process.terminate.call_count == expected_termination_call_count


@pytest.mark.parametrize(
    "test_id, exception_to_raise, expected_termination_call_count",
    [
        ("NoSuchProcess_ShouldContinue", psutil.NoSuchProcess, 0),
        ("AccessDenied_ShouldContinue", psutil.AccessDenied, 0),
        ("ZombieProcess_ShouldContinue", psutil.ZombieProcess, 0),
        ("UnexpectedError_ShouldContinue", ValueError, 0),
    ],
)
@patch("psutil.process_iter")
@patch("os.getpid")
@patch("psutil.pid_exists")
def test_close_orphaned_threads_exception_handling(
    mock_pid_exists,
    mock_getpid,
    mock_process_iter,
    test_id,
    exception_to_raise,
    expected_termination_call_count,
):
    # Arrange
    mock_process = MagicMock()
    mock_parent = MagicMock()

    mock_process.parent.side_effect = exception_to_raise
    mock_process.terminate = MagicMock()

    mock_parent.pid = 123
    mock_process.owner_pid = 456
    mock_pid_exists.return_value = False

    mock_getpid.return_value = os.getpid()
    mock_process_iter.return_value = [mock_process]

    # Act
    close_orphaned_threads()

    # Assert
    assert mock_process.terminate.call_count == expected_termination_call_count



def monitor_threads(interval=60):
    """
    Periodically check for and close orphaned threads.
    """
    while True:
        print("Checking for orphaned threads...")
        close_orphaned_threads()
        time.sleep(interval)

if __name__ == "__main__":
    print("Starting orphaned thread monitor...")
    try:
        # Run the monitor in a separate thread
        monitor_thread = threading.Thread(target=monitor_threads, daemon=True)
        monitor_thread.start()
        
        # Keep the main thread alive
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\nStopping orphaned thread monitor...")