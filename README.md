# continuum

## Overview

This project is an attempt to make a fairly exact copy of the 68000 Mac game Continuum for the web. The idea is to not only make the game playable in a browser, but also to recreate the type of code structure that was needed in the days before we had lots of CPU power, memory, high-level abstractions, and dev tooling.

It is based on the original source code and related files released publicly by the original developers [here](https://www.ski-epic.com/continuum_downloads/).

All of the files are in the `orig` folder in this repository.

## Goals

- Game engine structure, data types, functions, business logic, etc. stay as close to the original as possible
- Game works with the original map files, graphics, and sound (i.e., we need to handle decoding)

## Some Rules

- Reorganizing is allowed but it should be easy to trace new code back to the original code via information in the file header
- Unit testing is allowed
- Use original names where possible for functions, variables, etc.

## Roadmap

### 1. Planet Parser

- Parse the original planet files
- Write a sample app that can draw them to the screen

### 2. Bitmap Parser

- Parse the original bitmaps
- Write a sample app to display them to the screen
- Write a sample app to generate bit accurate planet maps

### 3. Gameplay

- [TBD]

### 4. Sound

- [TBD]

### 5. Planet Editor (maybe)
