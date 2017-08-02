---
layout: default
title: "Stm32duino using DMA for PWM or Timer"
categories: stm32 stm32duino dma pwm timer
---

# Using DMA for timer or PWM in stm32duino or leaflab maple
While stm32duino has a generic API for using DMA for any peripheral, 
it is not well known. I had to search various examples to get an idea.
There too older examples use deprecated API, while newer `tube` API  is 
intuitive and easy.

## Setting up of DMA and peripherals
On the look of it, DMA API looks sufficient to set up and execute 
transfers. But stm32 hardware requires you to set up both DMA and peripheral for DMA. Which means calling API for both DMA and peripheral configuration. Many a times these calls look like redundant since same information has already been configured, but nevertheless, to set-up registers, you must call both APIs.

## Setting up DMA
1. Create an instance of `dma_tube_config`
2. Put address of array as source/destination
3. src/dest size is 8/16/32 bit, which is minimum unit of transfer.
4. *Find the **peripheral data register** for DMA transfer.* In most cases there is single data register named `DR` used for transfer. But in case of timers it is more complicated as explained below.
5. Set up flags for interrupt, circular transfers etc. 
6. Set up DMA channel associated with peripheral.
7. Initialize DMA
8. Call `dma_tube_cfg` with this configuration.

## Setting up peripheral
This is more of a peripheral dependant task. Usually you have to enable DMA requests by peripheral. Sometimes addresses need to be set.

## Finalize and start DMA
1. Attach interrupt handler routine if interrupts are enabled
2. Start DMA for given channel
3. Start peripheral

Although this much information can be deduced from examples found on various blogs, setting up timer device (in PWM mode) for DMA was a tricky task due to added complexities and no handy reference. I had to go though many pages of reference manual to find some info. It must be miracle that it worked for me in  2nd or 3rd attempt given that I had no idea what I was doing.

## PWM
Pulse Width Modulation, generally used for dimming effects or generating analog signal, works using hardware timers. 
* Timer Counter counts number of *clock pulses* elapsed
* Timer `CCR` (compare) register sets number of pulses after which output inverts (usually high
to low)
* Timer `ARR` (reload) sets total width of pulse.

After initialization in PWM mode, `ARR` is set to full 2<sup>16</sup> value. Prescaler is also set to 1, which divides system clock frequency by half. So effective 
frequency of normal PWM is just `36MHz/`2<sup>16</sup> = `549 Hz`.

So to change this frequency, we must change reload value. But this reload value limits vertical resolution (voltage levels).

Anyway, back to PWM using DMA:
## Setting up DMA
Most of the steps mentioned above. For PB7 pin `tube_req_src` was 
`DMA_REQ_SRC_TIM4_CH2`. DMA update register is `DMAR` instead of `CCR` directly.

## Setting up Timer
This was interesting. But thankfully timer API header has enough documentation to ease it. From ref. manual, I got that there are many timer registers that can be updated using DMA. So, what registers reflect values in `DMAR` is decided by `base_addr` and `burst_len`. To simplify:

* `base_addr` is address of first Timer register to be updated (starting from CR1)
* `burst_len` provides number of continuous registers to be updated from `base_addr`
* `burst_len` values are fetched one after other from `DMAR` and registers starting from `base_addr` are updated.

So, my timer set up function had calls to 
1. `timer_dma_set_base_addr`
2. `timer_dma_set_burst_len`
3. Finally `timer_dma_enable_req` to enable DMA requests.

After that I enabled DMA and started timer and *voilà!!* DMA was working. I enabled completion interrupt just to check whether it was working or not.

## References:
STM32F103 reference manual
timer.h from stm32duino->system/libmaple/include/libmaple
dma.h from aforementioned folder
http://polpla.cat/tutorials/SPI+DMA.html




