@echo off
setlocal enabledelayedexpansion

set "source=E:\Dev\websites\repairradar-v0.1\src\actions"
set "target=E:\Dev\websites\repairradar-v0.1\src\actions\combined"

if not exist "%target%" mkdir "%target%"

:: Loop through all files recursively
for /r "%source%" %%F in (*) do (
    if not exist "%%F\NUL" (
        set "filepath=%%F"
        set "parentfolder=%%~dpF"
        set "parentfolder=!parentfolder:~0,-1!"

        :: Using a sub-call here to ensure variable updates happen correctly
        call :process "%%F" "!parentfolder!" ".txt"
    )
)

echo Done copying and renaming files.
pause
exit /b

:process
set "fullpath=%~1"
set "parentfolder=%~2"
set "extension=%~3"

for %%A in ("%parentfolder%") do set "foldername=%%~nxA"
set /a count_!foldername!+=1
call set "newcount=%%count_!foldername!%%"

copy "%fullpath%" "%target%\!foldername!_!newcount!!extension!" >nul
goto :eof
