# libmp3lame.so: the LAME 3.100 MP3 encoder (LGPL, see lame/COPYING) plus the small
# JNI bridge in mp3_encoder.c. Built as its own shared library so the LGPL code stays
# a separately replaceable component.
#
# This app does not use React Native's New Architecture, so unlike a New Architecture
# app there is no libappmodules to build here: this file builds LAME and nothing else.
cmake_minimum_required(VERSION 3.22.1)
project(mp3lame C)

file(GLOB LAME_SOURCES ${CMAKE_CURRENT_SOURCE_DIR}/lame/libmp3lame/*.c)

add_library(mp3lame SHARED
        ${LAME_SOURCES}
        ${CMAKE_CURRENT_SOURCE_DIR}/mp3_encoder.c)

target_include_directories(mp3lame PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/lame
        ${CMAKE_CURRENT_SOURCE_DIR}/lame/include
        ${CMAKE_CURRENT_SOURCE_DIR}/lame/libmp3lame)

target_compile_definitions(mp3lame PRIVATE HAVE_CONFIG_H NDEBUG)

# LAME's own sources are kept exactly as released, warnings and all.
set_source_files_properties(${LAME_SOURCES} PROPERTIES COMPILE_OPTIONS "-w")
target_compile_options(mp3lame PRIVATE -O2 -fvisibility=hidden)

# Google Play requires every 64-bit native library to be aligned to 16 KB pages.
# NDK r27 still links with 4 KB pages unless told otherwise, so it is told twice:
# once through the toolchain flag in build.gradle and once here, on the link line.
target_link_options(mp3lame PRIVATE "-Wl,-z,max-page-size=16384")

target_link_libraries(mp3lame m)
