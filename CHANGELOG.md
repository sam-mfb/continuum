# Changes

## 1.3.1 - 2025.11.01

**BREAKING CHANGE - Game Engine Version 2**

Fix bug with number of starting lives - games now correctly start with 3 lives (SHIPSTART + 1) instead of 2. This is a breaking change for validation: recordings made with version 1 will fail validation as they have incorrect initial state.

## 1.3.0 - 2025.10.26

Game recording, validation, and replay
Change defaults to modern rendering and gray background

## 1.2.1 - 2025.10.19

Modern rendering option requires modern collision model

## 1.2.0 - 2025.10.14

Modern rendering option
Ability to use solid gray background (requires modern rendering option)
Various bug fixes around level transitions

## 1.1.2 - 2025.10.11

Fix transition state bug

## 1.1.1 - 2025.10.11

Reorganize rendering code

## 1.1.0 - 2025.10.11

Add new multi-channel audio system to allowing mixing sounds

## 1.0.5 - 2025.10.09

Upgrade Audio System to use AudioWorklet

## 1.0.4 - 2025.10.06

Fix bug in ship contain
Fix bug in collision running during transition

## 1.0.3 - 2025.10.06

Add "Chaos" and "Lee's Galaxy" galaxies
Fix collisions-during-fizz bug in new collision model
