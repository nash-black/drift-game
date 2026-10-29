cmake_minimum_required(VERSION 3.20)
project(turbo_horizon LANGUAGES CXX)

include(FetchContent)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(BUILD_GAMES OFF CACHE BOOL "" FORCE)
FetchContent_Declare(
  raylib
  GIT_REPOSITORY https://github.com/raysan5/raylib.git
  GIT_TAG 5.5
  GIT_SHALLOW TRUE
)
FetchContent_MakeAvailable(raylib)

add_executable(turbo_horizon src/main.cpp)
target_link_libraries(turbo_horizon PRIVATE raylib)

if(MSVC)
  target_compile_options(turbo_horizon PRIVATE /W4 /permissive-)
else()
  target_compile_options(turbo_horizon PRIVATE -Wall -Wextra -Wpedantic)
endif()
