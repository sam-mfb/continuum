/*
	File Sound.c:  Sound routines for Gravity Well
	
	Copyright (c) 1986-88 Randall H. Wilson
	
	This approach to sound uses the Sound Driver, which is no longer
	supported by Apple.  It will probably work less and less over
	the years.  I need to switch to the Sound Manager.  As well as
	a newer version of Think C.  - Randy, 6/21/93
*/

#include <VRetraceMgr.h>
#include <SoundDvr.h>
#include "GW.h"

#define	HARDSNDBUF	(MemTop - 0x300)
#define	SNDBUFLEN	370

#define	NO_PRIOR	0	/* priorities of various sounds	*/
#define	FIRE_PRIOR	70
#define	EXP1_PRIOR	90	/* bunker explosion	*/
#define	THRU_PRIOR	35
#define	BUNK_PRIOR	40
#define	SOFT_PRIOR	30
#define	SHLD_PRIOR	70
#define	FUEL_PRIOR	80
#define	EXP2_PRIOR	100	/* ship explosion		*/
#define	EXP3_PRIOR	50	/* alien explosion	*/
#define	CRACK_PRIOR	92
#define	FIZZ_PRIOR	93
#define	ECHO_PRIOR	94

#define	FUELBEEPFREQ	26	/* frequency of beeps in fuel pickup */
#define	SHLD_FREQ	50	/* frequency of shield sound		*/

extern int shielding, thrusting, Screen_Type;


typedef struct 
{
	int mode;
	long count;
	char waveBytes[SNDBUFLEN*2];
} myFFSynthRec;
myFFSynthRec *synthptr;		/* buffer for calls to Mac II */
char *soundbuffer;		/* holds free form sound description */
char *sndswitch;		/* for turning sound on and off */

int soundlock;			/* true when changing current sound */
	/* do_sound does nothing in the rare event that soundlock is true */
int currentsound, priority;
int phase, freq;		/* for ship firing sound	*/
int period, amp, ampchange;	/* for bunk firing sound	*/
int brightlen, brightphase, brightamp, brightdir; /* for bright sounds	*/
int fuelcount;			/* for fuel sound		*/
int crackcount;			/* for mission complete		*/
int fizzcount;			/* for planet fizz-out		*/
int echocount;			/* for echoing away		*/

char sine_wave[256];

char expl_rands[128];
char thru_rands[128];
char hiss_rands[256];

VBLTask taskrec;

do_no_sound(), do_fire_sound(), do_expl_sound(), do_thru_sound(),
	do_bunk_sound(), do_shld_sound(), do_fuel_sound(),
	do_crack_sound(), do_fizz_sound(), do_echo_sound();
		
(*snd_fcns[])() = {	do_no_sound,
			do_fire_sound,
			do_expl_sound,
			do_thru_sound,
			do_bunk_sound,
			do_bunk_sound,
			do_shld_sound,
			do_fuel_sound,
			do_expl_sound,
			do_expl_sound,
			do_crack_sound,
			do_fizz_sound,
			do_echo_sound	};

static int priorities[] = {NO_PRIOR, FIRE_PRIOR, EXP1_PRIOR, THRU_PRIOR,
			BUNK_PRIOR, SOFT_PRIOR, SHLD_PRIOR, FUEL_PRIOR,
			EXP2_PRIOR, EXP3_PRIOR, CRACK_PRIOR, FIZZ_PRIOR,
			ECHO_PRIOR };


pascal void do_sound()
{
	SetUpA5();
	
	if (!soundlock)			/* try to avoid interrupt bugs */
		(*snd_fcns[currentsound])();/* call appropriate sound routine */
	
	if (Screen_Type != MACHINE_PLUS)
		StartSound(synthptr, (long) SNDBUFLEN*2, NULL);
	taskrec.vblCount = 1;
	
	RestoreA5();
}


do_no_sound()
{
	asm{
		move.l	soundbuffer(A5), A0
		move.l	#0x80808080, D0
		moveq	#32, D2
		moveq	#(SNDBUFLEN-2)/16-1, D1
	@noloop	movep.l	D0, 0(A0)
		movep.l	D0, 8(A0)
		movep.l	D0, 16(A0)
		movep.l	D0, 24(A0)
		add.w	D2, A0
		dbra	D1, @noloop
		movep.w	D0, 0(A0)
	}
}

do_fire_sound()
{
	register char *wave;
	register int pos;

	wave = sine_wave;
	pos = phase;
	asm{
			movem.l	D3, -(SP)
			move.l	soundbuffer(A5), A0
			moveq	#5, D3
			bra.s	@enter
		@biglp	move.w	freq(A5), D1
		@loop	move.b	0(wave, pos), (A0)
			addq.w	#2, A0
			add.b	D1, pos
			dbf	D2, @loop
		@enter	move.w	#SNDBUFLEN/5-1, D2
			subq.w	#1, freq(A5)
			dbf	D3, @biglp
			addq.w	#1, freq(A5)
			movem.l	(SP)+, D3
	}
	phase = pos;
	priority -= 5;
	if (freq < 5)
		clear_sound();
}

do_expl_sound()
{
	register char *pers;
	
	pers = expl_rands + (Random() & 63);
	asm {
			move.l	soundbuffer(A5), A0
			move.w	#SNDBUFLEN/2-1, D1
			move.b	amp+1(A5), D0
			asl.w	#8, D0
		@biglp	eor.w	#0xFF00, D0
			moveq	#0, D2
			move.b	(pers)+, D2
			asr.w	#1, D2
		@loop	move.w	D0, (A0)+
			move.w	D0, (A0)+
			subq.w	#1, D1
			dblt	D2, @loop
			bge.s	@biglp
	}
	if (currentsound != EXP2_SOUND)		/* don't allow interruption of	*/
		priority -= ampchange;			/*  ship explosion				*/
	if ( (amp += ampchange) > 127)
		clear_sound();
}

do_thru_sound()
{
	register char *pers;
	register int count;
	
	pers = thru_rands + (Random() & 63);
	asm {
			move.l	soundbuffer(A5), A0
			move.w	#SNDBUFLEN/37-1, count
		@biglp	moveq	#0, D0
			move.b	(pers)+, D0
			lsr.w	#1, D0
			lsl.w	#8, D0
			move.w	D0, D1
			swap	D0
			move.w	D1, D0
			move.w	#(37-1)/6-1, D2
		@loop	move.l	D0, (A0)+
			move.l	D0, (A0)+
			move.l	D0, (A0)+
			dbf	D2, @loop
			move.w	D0, (A0)+
			dbf	count, @biglp
	}

	if (!thrusting)
		clear_sound();
}

do_bunk_sound()
{
	asm {
			move.l	D3, -(SP)
			move.l	soundbuffer(A5), A0
			move.b	amp+1(A5), D0
			asl.w	#8, D0
			moveq	#4, D3
			move.w	#SNDBUFLEN/5, D2
		@biglp	move.w	period(A5), D1
			asr.w	#1, D1
			eor.w	#0xFF00, D0
		@loop	move.w	D0, (A0)+
			move.w	D0, (A0)+	
			subq.w	#2, D2
			dble	D1, @loop
			bgt.s	@biglp
			move.w	#SNDBUFLEN/5, D2
			addq.w	#1, period(A5)
			dbra	D3, @loop
			move.l	(SP)+, D3
	}
	priority -= 1;
	amp += ampchange;
	if ( period > 40)
		clear_sound();
}

do_shld_sound()
{
	int freq;
	static int hi = TRUE;
	
	freq = SHLD_FREQ;
	if (hi = !hi)	freq += 2;
	unclear_tone(freq, 96);
	if (!shielding)
		clear_sound();
}

do_fuel_sound()
{
	if ((--fuelcount >> 2) & 1)
		clear_tone(FUELBEEPFREQ);
	else
		do_no_sound();
	if (!fuelcount)
		clear_sound();
}

/*
do_mico_sound()
{
	--micocount;
	if (micocount > 24)
		clear_tone(7);
	else
		clear_tone(14);
	if (!micocount)
		clear_sound();
}
*/

do_crack_sound()
{
	register char *vals;
	
	if (--crackcount)
	{
		vals = hiss_rands + (Random() & 31);
		asm {
			move.l	soundbuffer(A5), A0
			move.w	#SNDBUFLEN/2-1, D1
			moveq	#0x20, D0
			ror.w	#8, D0
		@biglp	eori.w	#0xFF00, D0
			moveq	#0, D2
			move.b	(vals)+, D2
			asr.w	#2, D2
		@loop	move.w	D0, (A0)+
			move.w	D0, (A0)+
			subq.w	#1, D1
			dblt	D2, @loop
			bge.s	@biglp
		}
	}
	else
		clear_sound();
}


do_fizz_sound()
{
	int amp;
	register char *vals;
	
	if (--fizzcount)
	{
		amp = fizzcount + 40;
		vals = hiss_rands + (Random() & 31);
		asm {
			move.l	soundbuffer(A5), A0
			move.w	#SNDBUFLEN/2-1, D1
			move.w	amp(A6), D0
			ror.w	#8, D0
		@biglp	eori.w	#0xFF00, D0
			moveq	#0, D2
			move.b	(vals)+, D2
			asr.w	#1, D2
		@loop	move.w	D0, (A0)+
			move.w	D0, (A0)+
			subq.w	#1, D1
			dblt	D2, @loop
			bge.s	@biglp
		}
	}
	else
		clear_sound();
}



do_echo_sound()
{
	int amp, c1, c2;
	register char *vals;
	static int echostrs[] = {1, 2, 5, 9, 19, 37};
	
	if (--echocount)
	{
		c1 = echocount % 20;
		c2 = echocount / 20;
		if (c1 >= 15)
		{
			do_no_sound();
			return;
		}
		amp = 128 - (((15 - c1) * echostrs[c2]) >> 4);
		vals = hiss_rands + (Random() & 31);
		asm {
			move.l	soundbuffer(A5), A0
			move.w	#SNDBUFLEN/2-1, D1
			move.w	amp(A6), D0
			ror.w	#8, D0
		@biglp	eori.w	#0xFF00, D0
			moveq	#0, D2
			move.b	(vals)+, D2
			asr.w	#1, D2
		@loop	move.w	D0, (A0)+
			move.w	D0, (A0)+
			subq.w	#1, D1
			dblt	D2, @loop
			bge.s	@biglp
		}
	}
	else
		clear_sound();
}


	/* fill buffer from OFFSET position to compensate for Mac+ lag */
#define	SOFFSET	9

clear_tone(freq)
int freq;
{
	register char *Wave;
	register int pos;

	Wave = sine_wave;
	pos = phase;
	asm{
		move.w	freq(A6), D1
		move.l	soundbuffer(A5), A0
		move.w	#SNDBUFLEN-1, D2
		cmp.w	#MACHINE_PLUS, Screen_Type(A5) /* if Mac+, */
		bne.s	@loop2		/* just fill the buffer */
		adda.w	#SOFFSET*2, A0
		sub.w	#SOFFSET, D2
	@loop	move.b	0(Wave, pos), (A0)
		addq.l	#2, A0
		add.b	D1, pos
		dbf	D2, @loop

		move.l	soundbuffer(A5), A0
		move.w	#SOFFSET-1, D2
	@loop2	move.b	0(Wave, pos), (A0)
		addq.l	#2, A0
		add.b	D1, pos
		dbf	D2, @loop2
	}
	phase = pos;
}

unclear_tone(freq, vol)
int freq, vol;
{
	asm {
			move.l	soundbuffer(A5), A0
			move.w	#SNDBUFLEN-1, D2
			move.w	vol(A6), D0
		@biglp	neg.b	D0
			move.w	freq(A6), D1
		@loop	move.b	D0, (A0)
			addq.w	#2, A0
			subq.w	#1, D2
			dblt	D1, @loop
			bge.s	@biglp
	}
}


bright_tone()
{
	asm {
			movea.l	soundbuffer(A5), A0
			adda.w	#9*2, A0
			move.w	#SNDBUFLEN-1-9, D3
			move.w	brightamp(A5), D0
			move.w	brightphase(A5), D1
			move.w	brightdir(A5), D2
			bra	@loop
		
		@biglp	neg.b	D2
			move.w	brightlen(A5), D1
		@loop	move.b	D0, (A0)
			addq.l	#2, A0
			add.b	D2, D0
			subq.w	#1, D3
			dblt	D1, @loop
			bge.s	@biglp
				
			movea.l	soundbuffer(A5), A0
			move.w	#9-1, D3
			bra	@loop2
				
		@biglp2	neg.b	D2
			move.w	brightlen(A5), D1
		@loop2	move.b	D0, (A0)
			addq.l	#2, A0
			add.b	D2, D0
			subq.w	#1, D3
			dblt	D1, @loop2
			bge.s	@biglp2

			move.w	D0, brightamp(A5)
			move.w	D1, brightphase(A5)
			move.w	D2, brightdir(A5)
	}
}



start_sound(whichsound)
int whichsound;
{
	soundlock = TRUE;
	if (priorities[whichsound] > priority)
	{	
		priority = priorities[whichsound];
		currentsound = whichsound;
		switch (whichsound)
		{
			case FIRE_SOUND:
				freq = 27;
				phase = 0;
				break;
			
			case BUNK_SOUND:
				period = 2;
				amp = 104;
				ampchange = 3;
				break;
			
			case SOFT_SOUND:
				period = 2;
				amp = 120;
				ampchange = 1;
				break;
				
			case EXP1_SOUND:
				amp = 16;
				ampchange = 2;
				break;
				
			case EXP2_SOUND:
				amp = 1;
				ampchange = 1;
				break;
			
			case EXP3_SOUND:
				amp = 64;
				ampchange = 3;
				break;
			
			case FUEL_SOUND:
				fuelcount = FUELBEEPS*2 << 2;
				phase = 0;
				break;
			
			case CRACK_SOUND:
				crackcount = 6;
				break;
			
			case FIZZ_SOUND:
				fizzcount = 80;
				break;
			
			case ECHO_SOUND:
				echocount = 20*6 - 1;
				break;
		}
	}
	soundlock = FALSE;
}


int realsound = 0;

open_sound()
{
	int level;
	
	sndswitch = *((char **) 0x1D4);
	GetSoundVol(&level);
	realsound = level > 0;
	
	if (realsound)
	{
		soundlock = 0;
		clear_sound();
		if (Screen_Type == MACHINE_PLUS)
		{
			soundbuffer = HARDSNDBUF;
			*sndswitch &= ~0x80;
		}
		else
		{
			synthptr = (void *) NewPtr((long) sizeof(myFFSynthRec));
			if (synthptr == NULL)
				memory_error();
			synthptr->mode = ffMode;
			synthptr->count = 2L << 16;
				/* ==2 to emulate normal buffer */
			soundbuffer = synthptr->waveBytes;
		}
		taskrec.qType = vType;
		taskrec.vblAddr = (ProcPtr) do_sound;
		taskrec.vblPhase = 0;
		show_sound();
	}
}

close_sound()
{
	if (realsound)
	{
		hide_sound();
		if (Screen_Type == MACHINE_PLUS)
			*sndswitch |= 0x80;
		else
			DisposPtr(synthptr);
	}
}

clear_sound()
{
	if (realsound)
	{
		currentsound = NO_SOUND;
		priority = 0;
	}
}


hide_sound()
{
	if (realsound)
	{
		VRemove(&taskrec);
		do_no_sound();
		if (Screen_Type != MACHINE_PLUS)
			StopSound();
	}
}

show_sound()
{
	if (realsound)
	{
		taskrec.vblCount = 1;
		VInstall(&taskrec);
	}
}



