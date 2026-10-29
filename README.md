# Turbo Horizon (C++)

Turbo Horizon is a native C++ arcade racer built with raylib. The garage lets
you choose from four cars with different speed, acceleration, handling, and
nitro characteristics. Each race puts you on the starting line against five
AI drivers.

## Build on Windows

Install CMake 3.20 or newer and a C++17 compiler (Visual Studio Build Tools
with the **Desktop development with C++** workload is recommended). The first
CMake configure downloads raylib 5.5.

```powershell
cmake -S . -B build
cmake --build build --config Release
.\build\Release\turbo_horizon.exe
```

With a single-configuration generator, run `.\build\turbo_horizon.exe`.

## Controls

- **W / Up Arrow**: accelerate
- **S / Down Arrow**: brake
- **A / D** or **Left / Right Arrow**: steer
- **Space** while steering: drift and earn drift score
- **Shift**: use nitro
- **P / Escape**: pause or resume
- **R** while paused: return to the garage
- **Enter / Space** in the garage: start a race
- **Left / Right Arrow** or the garage arrows: select a car
