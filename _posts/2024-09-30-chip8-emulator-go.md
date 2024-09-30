---
layout: default
title: "Implementing a CHIP-8 Emulator in Go"
categories: golang chip8 emulator
date: 2024-09-30
excerpt: "Chip-8 emulator implemented in golang with raylib. Iteration wise description."
---

# Implementing a CHIP-8 Emulator in Go
(Blog originally written by me, grammar correction by ChatGPT).

## Preface
I wanted to undertake a moderately sized project that could be completed in 3-4 days. I aimed for something that wasn't too trivial or small, avoided web projects, and wasn't so lengthy that it would take a week or more—often a sign that it would be left as "always in progress."

### Why an Emulator?
Creating an emulator brings you as close to hardware as possible, providing insight into hardware details and the tricks and quirks used in software. It allows for a better understanding of software behavior.

### Why CHIP-8?
The CHIP-8 is perfect for a 2-3 day project. It isn't as complicated as the NES or subsequent systems, yet it offers a full taste of emulated systems. Additionally, it's a great gateway to more serious emulators like x86, ARM, and RISC-V.

### Why Go?
Go is a static, compiled language that is also simple to use. There's no need to worry about memory management, and its syntax is similar to Python. I also hadn’t worked on a Go project in a while and wanted to get my hands dirty again.

## CHIP-8 Hardware Overview

### Introduction
CHIP-8 is a virtual hardware/programming language. It has instructions, supports 16-bit memory, and can accommodate various peripherals, which can be mapped according to the implementer. The memory is unified for both program and data, with a dedicated stack, an attached keyboard, display, sound, and timer. There are instructions for all peripherals.

### Memory
CHIP-8 can address up to 4 KB of memory. The first 512 bytes are reserved for the interpreter by convention. Thus, most ROMs assume that code starts at 0x200 (512). Sprite memory access doesn't follow this convention, but to maintain uniformity, I ensured that all addresses, except for font sprites, lie above the 0x200 boundary.

### Registers
The language features 16 general-purpose 8-bit registers, named V0-V15. Many instructions use V15 as a flag register and it is usually avoided in general-purpose operations. There's an I register, which is the only 16-bit register, typically used for storing addresses. Additionally, there are registers TD for timer and SD for sound.

There are shadow registers like the program counter (PC) and stack pointer (SP) that are not directly accessible via instructions.

### Stack
CHIP-8 provides a 16-entry stack, with each entry being 16 bits wide. It is primarily used for saving return addresses in function calls. There are no explicit push and pop instructions.

### Peripherals: Keyboard, Display, Sound, Timer, Sprites

#### Keyboard
CHIP-8-based systems originally used a 16-key keyboard, although instructions allow for up to 8-bit keycodes. Most ROMs, however, assume only 16 keys.

#### Display
CHIP-8 systems utilized a 64x32 1-bit display, which is standard for most ROMs.

##### Sprites
CHIP-8 uses sprites for drawing. Each sprite is represented in memory as a block of 8 columns and 1-15 rows. The drawing instruction simply copies this block to the display memory.

##### Font Sprites
These are fixed-size sprites of 5x8, representing characters 0-9 and A-F.

#### Sound
CHIP-8 supports just one tone, and the instruction allows for setting a sound timer. The tone starts whenever a non-zero value is written to this timer and remains active until the timer reaches zero.

#### Timer
CHIP-8 has an 8-bit timer. There is one instruction to set the timer value and another to read the current timer value.

## Iteration 0: Raylib-go Minimal Example
I decided to use [Raylib-go](https://github.com/gen2brain/raylib-go) for this project. There was no specific reason for choosing Raylib over SDL; I simply wanted to explore it. Based on my experience in this project, I plan to continue using it in similar endeavors.

Before starting the actual emulator implementation, I reviewed Raylib and its Go bindings. I began with its "Hello World" code and finalized the window dimensions to be 1280x640, with 64x32 pixels—each pixel represented by a square of size 18x18 and with 2 units of spacing between pixels.

The display buffer is implemented as a 32-element array of uint64. Essentially, each 64-bit unsigned integer represents a row on the display. This works since the CHIP-8 display has just 1-bit color. To render this display buffer, I used two nested loops, drawing pixels column by column, from left to right and top to bottom.

## Iteration 1: Minimum Functioning System

### Loading ROM
The first task is to find a CHIP-8 ROM and load it. I used test ROMs from the [Timendus CHIP-8 test suite](https://github.com/Timendus/chip8-test-suite/). CHIP-8 ROMs do not have any headers or sections; they start immediately with instructions. The only constraint is that the loading address of the ROM should be 0x200, since jump instructions expect this.

I created a `Machine` struct in my code and added a 4 KB uint8 array to represent RAM. I read the ROM file from the slice [0x200:], which loads instructions at the correct address without needing any additional calculations.

The first ROM I wanted to run correctly was the CHIP-8 splash screen. It requires the following instructions to be implemented:
- 00E0: Clear the screen
- 6xnn: Load immediate value into normal register x
- Annn: Load immediate value into index (address) register
- Dxyn: Draw sprite
- 1nnn: Jump

Before implementing these instructions, I needed to add registers and other fields to the processor. I added an array for general-purpose registers, the index register, and the program counter register.

The only tricky part in the above instructions is the draw sprite command. `Dxyn` gives x, y, and n, which means drawing the sprite at location (Vx, Vy) in the display buffer. x and y are register numbers, not actual coordinates, and `n` indicates the number of bytes to draw. This allows for sprite sizes ranging from 1x8 to 15x8.

Implementation was straightforward. One change I made after encountering a few bugs was to iterate and shift the mask from left to right. There were some issues with my rendering logic, as it was rendering horizontally mirrored. The problem lay in mask calculation and loop indices, which went from right to left. I switched to a left-to-right approach for both sprite copying and screen drawing to resolve these issues.

Everything worked as expected at this point, and I had a "Timendus" logo on my screen after running the first test ROM.

## Iteration 2: Adding One More Instruction for the IBM Logo
Transitioning from the "Timendus" logo to the "IBM" logo required the implementation of just one more instruction: `7xnn`, which adds an immediate value to the index register (similar to `6xnn`, but 16-bit). After implementing that, the IBM logo also worked properly.

## Iteration 3: Using Test ROM and Clearing All Tests
Test ROM 3 represents a significant leap forward, as it checks whether 21 instructions and all registers are implemented. At this point, I decided to reshuffle the switch cases and implement by groups. Aside from this adjustment, the rest of the implementation was straightforward. Initially, rendering was not working at all due to a partially addressed bug in the rendering logic, which I fully resolved here. After this point, bit masking and rendering did not cause any further issues.

## Iteration 4: Flags
CHIP-8 uses the VF register as a flag register. This means that any instruction that can set a flag must set `VF` to 0 or 1, regardless of its prior value. It took me some time to understand this semantic. The test ROM explicitly sets `VF` to a specific value and checks its value after executing certain instructions. In my implementation, I set `VF` as the last step of execution to avoid any issues.

One more minor detail is that when a flag is set or reset can vary depending on the instruction. For example, the subtraction operation `8xy5` sets the flag if `Vx >= Vy`. This condition isn't explicitly mentioned, but I inferred it based on the test results.

## Iteration 5: Keyboard
The CHIP-8 keypad consists of 16 keys (4-bit). Three instructions need to be implemented:
1. Skip the instruction if key x is pressed.
2. Skip the instruction if key x is not pressed.
3. Get the pressed key.

The "Get pressed key" instruction is blocking, meaning the entire machine must wait for a key press before proceeding. Thankfully, Raylib provides functions for all three requirements, allowing for straightforward 1-to-1 mapping.

## Iteration 6: Timer
The CHIP-8 timer runs at 60 Hz, while a normal CPU operates at 450-500 MHz. Most specifications suggest managing these two timers independently. However, for my implementation, I found it easier to integrate the timer within the global CPU loop. I tracked the previous timer tick and called the timer update whenever the current tick was 2 microseconds or later than the previous one.

The timer hardware is quite straightforward. It consists of one register, `DT`, and two instructions: `Fx07` (Get) and `Fx15` (Set). The `Fx07` instruction retrieves the current timer value and places it into register `Vx`, while `Fx15` sets the timer value from `Vx`. The timer begins counting down as soon as a non-zero value is written to `DT` and stops when `DT` reaches zero. In addition to implementing these two instructions, I also needed to check and decrement the timer register count on each timer update tick.

## Iteration 7: Sound
The sound hardware is similar to the timer. It is designed to update at 60 Hz and features a single set register (ST). As long as `ST > 0`, the console should play a tone. The tone frequency is not fixed, allowing for flexibility in selection.

The only remaining task was to play the actual waveform. The Raylib sound module includes an example of generating a continuous waveform at a given frequency, which I adapted for my use.

## Iteration 8: Random Number Generator
CHIP-8 includes an instruction to generate a single-byte random number and AND it with another number. Since this is a requirement for most games, I chose the simplest implementation: returning a constant value ANDed with a byte on each call to this instruction.

This approach helped me get the `pong` game to work. However, Tetris would only generate a single type of piece. It took me a while to realize that the piece generator relies on random numbers to determine which piece to throw next.

So, I utilized Go's `rand` module to generate a random byte on each call. Once this was implemented, nearly all games began to function properly.

## Iteration 9: Threading
At this point, even though all games were running, they were too slow to be playable. I had added an explicit delay after each frame to maintain an FPS of 60 (16 ms). I thought this was the issue, so I reduced the delay. However, even setting it to 0 did not improve performance.

I conducted basic instrumentation of the main loop and discovered that the draw frame itself was taking 16 ms. After trying several approaches, it became apparent that this delay was set during Raylib initialization, where I specified a target FPS.

Since the CHIP-8 main processor is supposed to run at 500-600 Hz, I needed to separate the main loop and graphics into distinct loops. My initial instinct was to keep the main processor loop unchanged and move the drawing to a separate thread. However, doing so resulted in `SIGSEGV` crashes, leading me to conclude that graphics must be drawn in the main thread.

The current arrangement is that the main thread draws graphics at 60 Hz, while a goroutine executes machine instructions at 500 Hz. In the same goroutine, I track time for the timer and sound timer, updating them separately. Although it's generally suggested to keep timers in a separate thread, this setup works well enough.

## Iteration 10: Music
The default waveform generated by Raylib for any frequency is monotonous and doesn't provide a pleasing experience, even for short event sounds. I searched for suitable game event sounds and found a good track on [Envato](https://elements.envato.com/vibrant-game-game-key-1-LQA9WPL).

My first attempt was to decode the MP3 and load samples into a raw buffer, but this proved to be quite a challenging task. Fortunately, the Raylib sound module provides a direct function to load and play any supported sound file, including MP3. I chose this latter option for simplicity.

## Future Plans
I believe this emulator is satisfactory for my purposes. Currently, I have no plans for further improvements. Instead, I may consider implementing the next emulator, which would present a slightly greater challenge.

## Conclusion
The CHIP-8 emulator serves as an excellent introduction to any form of emulation. Given the available development resources, iterative development is quite manageable with short iterations. I would strongly recommend this project as a first step for anyone looking to dip their toes into game emulators (like the NES) or virtualization software (like QEMU).

## References
- [Go Raylib](https://github.com/gen2brain/raylib-go/)
- [Timendus CHIP-8 Test Suite](https://github.com/Timendus/chip8-test-suite/)
- [Kripod's CHIP-8 ROM Collection](https://github.com/kripod/chip8-roms/)
- [Cowgod's CHIP-8 Reference](http://devernay.free.fr/hacks/chip8/C8TECH10.HTM)
- [Game Sound](https://elements.envato.com/vibrant-game-game-key-1-LQA9WPL)
