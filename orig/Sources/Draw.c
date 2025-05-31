/*
	Draw.c:  routines to draw figures in Gravity Well
	
	Copyright (c) 1986-88 Randall H. Wilson
*/ 


#include "GW.h"
#include "Assembly Macros.h"


extern int ships[][SHIPHT*2];
extern char flames[][7];
extern char strafe_defs[][STRAFEHT];
extern int shield_def[];
extern Bunker_Pic *bunker_defs;
extern int fuel_1defs[][FUELHT*2];
extern int fuel_2defs[][FUELHT*2];
extern char digits[][DIGHEIGHT];
extern int worldwidth;

extern char *back_screen, *front_screen;
extern int xlength[LINE_E+1], ylength[LINE_E+1];

extern long background[2];


/*
	Draw Figure:  puts the 32 by HEIGHT figure on the screen
	at given spot.  Used to draw the ship.
*/
draw_figure(x, y, def, height)
register int x, y;
register int *def;
int height;
{
	y += SBARHT;
	asm
	{	
		movem.l	D3, -(SP)
		JSR_WADDRESS
		andi.w	#15, x
		moveq	#16, D2
		sub.w	x, D2
		
		moveq	#64, y
		move.w	height(A6), D3
		subq.w	#1, D3
	@loop	move.l	(def)+, D0
		beq.s	@skip
		move.w	D0, D1
		lsr.l	x, D0
		lsl.w	D2, D1
		or.l	D0, (A0)
		or.w	D1, 4(A0)
	@skip	adda.l	y, A0
		dbf	D3, @loop
		movem.l	(SP)+, D3
	}
}


/*
	Erase Figure:  erases the figure from the screen at given spot.  
		Used to erase the ship after checking for bouncing lines.
*/
int erase_figure(x, y, def, height)
register int x, y;
register int *def;
int height;
{
	y += SBARHT;
	asm
	{	
		movem.l	D3, -(SP)
		JSR_WADDRESS
		andi.w	#15, x
		moveq	#16, D2
		sub.w	x, D2
		
		moveq	#64, y
		move.w	height(A6), D3
		subq.w	#1, D3
	@loop	move.l	(def)+, D0
		beq.s	@skip
		move.w	D0, D1
		lsr.l	x, D0
		lsl.w	D2, D1
		not.l	D0
		not.w	D1
		and.l	D0, (A0)
		and.w	D1, 4(A0)
	@skip	adda.l	y, A0
		dbf	D3, @loop
		movem.l	(SP)+, D3
	}
}


/*
	Full Figure:  takes both mask & def, and puts the figure.
*/
int full_figure(x, y, def, mask, height)
register int x, y;
register int *def, *mask;
int height;
{
	y += SBARHT;
	asm
	{	
		movem.l	D3-D5, -(SP)
		JSR_WADDRESS
		andi.w	#15, x
		moveq	#16, D2
		sub.w	x, D2
		
		moveq	#64, y
		move.w	height(A6), D3
		subq.w	#1, D3
	@loop	move.l	(mask)+, D4
		bne.s	@notskip
		addq.w	#4, def
		bra.s	@skip
	@notskip	move.w	D4, D5
		lsr.l	x, D4
		lsl.w	D2, D5
		not.l	D4
		not.w	D5
		and.l	(A0), D4
		and.w	4(A0), D5
		move.l	(def)+, D0
		beq.s	@skip
		move.w	D0, D1
		lsr.l	x, D0
		lsl.w	D2, D1
		or.l	D0, D4
		move.l	D4, (A0)
		or.w	D1, D5
		move.w	D5, 4(A0)
	@skip	adda.l	y, A0
		dbf	D3, @loop
		movem.l	(SP)+, D3-D5
	}
}


/*
	Gray Figure:  reasserts background gray under the figure for
		later call to shift_figure.
*/
int gray_figure(x, y, def, height)
register int x, y;
register int *def;
int height;
{
	register long gray = background[y & 1];
	
	y += SBARHT;
	asm
	{	
		movem.l	D3, -(SP)
		JSR_WADDRESS
		andi.w	#15, x
		moveq	#16, D2
		sub.w	x, D2
		
		moveq	#64, y
		move.w	height(A6), D3
		subq.w	#1, D3
	@loop	move.l	(def)+, D0
		beq.s	@skip
		move.w	D0, D1
		lsr.l	x, D0
		lsl.w	D2, D1
		and.l	gray, D0
		and.w	gray, D1
		or.l	D0, (A0)
		or.w	D1, 4(A0)
	@skip	adda.l	y, A0
		ror.l	#1, gray
		dbf	D3, @loop
		movem.l	(SP)+, D3
	}
}


/*
	Shift Figure:  draws the figure only where there is
		gray under it currently.  Used for shadow.
*/
int shift_figure(x, y, def, height)
register int x, y;
register int *def;
int height;
{
	y += SBARHT;
	asm
	{	
		movem.l	D3, -(SP)
		JSR_WADDRESS
		andi.w	#15, x
		addq.w	#1, x	/* put _shifted_ in place */
		moveq	#16, D2
		sub.w	x, D2
		
		moveq	#64, y
		move.w	height(A6), D3
		subq.w	#1, D3
	@loop	move.l	(def)+, D0
		beq.s	@skip
		move.w	D0, D1
		lsr.l	x, D0
		lsl.w	D2, D1
		and.l	(A0), D0
		and.w	4(A0), D1
		move.w	#0, CCR
		roxl.w	#1, D1
		roxl.l	#1, D0
		or.l	D0, (A0)
		or.w	D1, 4(A0)
	@skip	adda.l	y, A0
		dbf	D3, @loop
		movem.l	(SP)+, D3
	}
}


/*	Check_Figure:  returns TRUE iff one of the figure's dots was
		already set.  Used to find collisions.
*/
int check_figure(x, y, def, height)
register int x, y;
register int *def;
int height;
{
	register long back;
	
	back = background[1 - (y & 1)];
	
	y += SBARHT;
	asm
	{	
		movem.l	D3, -(SP)
		JSR_WADDRESS
		andi.w	#15, x
		moveq	#16, D2
		sub.w	x, D2
		
		moveq	#64, y
		move.w	height(A6), D3
		subq.w	#1, D3
	@loop	move.l	(def)+, D0
		beq.s	@skip
		move.w	D0, D1
		lsr.l	x, D0
		lsl.w	D2, D1
		and.l	back, D0
		and.w	back, D1
		and.l	(A0), D0
		bne.s	@collision	
		and.w	4(A0), D1
		bne.s	@collision
	@skip	ror.l	#1, back
		adda.l	y, A0
		dbf	D3, @loop
		move.w	#FALSE, D0
		bra.s	@leave
		
	@collision	move.w	#TRUE, D0
		
	@leave	movem.l	(SP)+, D3
	}
}


/*
	Draw Medium:  puts the figure on the screen at given spot, including
		clipping.
	not currently used.

draw_medium(x, y, def, height)
register int x, y;
register int *def;
int height;
{
	if (y < 0)
	{	def -= y * 2;
		height += y;
		y = 0;
	}
	else if (y+height > VIEWHT)
		height = VIEWHT - y;
	
	y += SBARHT;
	asm
	{	
		movem.l	D3-D5, -(SP)
		JSR_WADDRESS
		moveq	#-1, D4	/* D4 is clip on left	*
		moveq	#-1, D5	/* D5 is clip on right	*
		cmp.w	#-16, x
		bge.s	@clip2
		not.l	D4
		bra.s	@drawit
	@clip2	tst.w	x
		bge.s	@clip3
		move.l	#0x0000FFFF, D4
		bra.s	@drawit
	@clip3	cmp.w	#SCRWTH-16, x
		blt.s	@clip4
		not.w	D4
		not.w	D5
		bra.s	@drawit
	@clip4	cmp.w	#SCRWTH-32, x
		blt	@drawit
		not.w	D5

	@drawit	andi.w	#15, x
		move.w	#16, D2
		sub.w	x, D2
		
		moveq	#64, y
		move.w	height(A6), D3
		subq.w	#1, D3
		blt.s	@leave
	@loop	move.l	(def)+, D0
		beq.s	@skip
		move.w	D0, D1
		lsr.l	x, D0
		lsl.w	D2, D1
		and.l	D4, D0
		and.w	D5, D1
		or.l	D0, (A0)
		or.w	D1, 4(A0)
	@skip	adda.w	y, A0
		dbf	D3, @loop
	@leave
		movem.l	(SP)+, D3-D5
	}
}
*/


/*
	Draw Fuel:  puts the fuel cell on the screen at given spot, including
		clipping.
*/
draw_medium(x, y, def, height)
register int x, y;
register int *def;
int height;
{
	if (y < 0)
	{	def -= y * 2;
		height += y;
		y = 0;
	}
	else if (y+height > VIEWHT)
		height = VIEWHT - y;
	
	y += SBARHT;
	asm
	{	
		movem.l	D3-D5, -(SP)
		JSR_WADDRESS
		moveq	#-1, D4	/* D4 is clip on left	*/
		moveq	#-1, D5	/* D5 is clip on right	*/
		cmp.w	#-16, x
		bge.s	@clip2
		not.l	D4
		bra.s	@drawit
	@clip2	tst.w	x
		bge.s	@clip3
		move.l	#0x0000FFFF, D4
		bra.s	@drawit
	@clip3	cmp.w	#SCRWTH-16, x
		blt.s	@clip4
		not.w	D4
		not.w	D5
		bra.s	@drawit
	@clip4	cmp.w	#SCRWTH-32, x
		blt	@drawit
		not.w	D5

	@drawit	andi.w	#15, x
		move.w	#16, D2
		sub.w	x, D2
		
		moveq	#64, y
		move.w	height(A6), D3
		subq.w	#1, D3
		blt.s	@leave
		
	@loop	move.l	(def)+, D0
		beq.s	@skip
		move.w	D0, D1
		lsr.l	x, D0
		lsl.w	D2, D1
		and.l	D4, D0
		and.w	D5, D1
		eor.l	D0, (A0)
		eor.w	D1, 4(A0)
	@skip	adda.w	y, A0
		dbf	D3, @loop
	@leave
		movem.l	(SP)+, D3-D5
	}
}




draw_medsm(x, y, def, height)
register int x, y;
register int *def;
int height;
{
	y += SBARHT;
	asm 
	{
		JSR_WADDRESS
		andi.w	#15, x
		sub.w	#16, x
		neg.w	x
		move.w	height(A6), D2
		subq.w	#1, D2
		blt	@leave
		moveq	#64, D1
	@loop	moveq	#0, D0
		move.w	(def)+, D0
		lsl.l	x, D0
		or.l	D0, (A0)
		adda.w	D1, A0
		dbf	D2, @loop
	@leave
	}
}



draw_shard(x, y, def, height)
register int x, y;
register int *def;
int height;
{
	y += SBARHT;
	asm 
	{
		JSR_WADDRESS
		andi.w	#15, x
		sub.w	#16, x
		neg.w	x
		move.w	height(A6), D2
		moveq	#64, D1
		bra.s	@enter
		
	@loop	moveq	#0, D0
		move.w	(def)+, D0
		lsl.l	x, D0
		eor.l	D0, (A0)
		adda.w	D1, A0
	@enter	dbf	D2, @loop
	}
}


int flamexdisp[32] = 
{ 0,-1,-3,-4,-7,-8,-9,-9,-10,-9,-9,-8,-7,-4,-3,-1,
  0, 1, 3, 4, 7, 8, 9, 9, 10, 9, 9, 8, 7, 4, 3, 1};

flame_on(x, y, rot)
register int x, y;
int rot;
{
	x += flamexdisp[rot] - FCENTER;
	y += flamexdisp[(rot+(32-8)) & 31] - FCENTER;
	
	draw_small(x, y, flames[rot], 7);
}



draw_strafe(x, y, rot, scrnx, scrny)
register int x, y;
int rot, scrnx, scrny;
{
	x -= STCENTER + scrnx;
	y -= STCENTER + scrny;
	
	if (y >= 0 && y < VIEWHT-STRAFEHT)
	{	if (x >= 0 && x < SCRWTH-STRAFEHT)
		    black_small(x, y, strafe_defs[rot], STRAFEHT);
		else
		{	x += worldwidth;
			if (x >= 0 && x < SCRWTH-STRAFEHT)
		    black_small(x, y, strafe_defs[rot], STRAFEHT);
		}
	}
}
		


draw_small(x, y, def, height)
register int x, y;
register char *def;
int height;
{
	y += SBARHT;
	if (height > 0)
	asm
	{
		FIND_BADDRESS(x, y)
		andi.w	#7, x
		
		moveq	#64-1, D2
		move.w	height(A6), D1
		subq.w	#1, D1
	@lp	moveq	#0, D0
		move.b	(def)+, D0
		ror.w	x, D0
		eor.b	D0, (A0)+
		rol.w	#8, D0
		eor.b	D0, (A0)
		adda.w	D2, A0
		dbf	D1, @lp
	}
}


black_small(x, y, def, height)
register int x, y;
register char *def;
int height;
{
	y += SBARHT;
	if (height > 0)
	asm
	{
		FIND_BADDRESS(x, y)
		andi.w	#7, x
		
		moveq	#64-1, D2
		move.w	height(A6), D1
		subq.w	#1, D1
	@lp	moveq	#0, D0
		move.b	(def)+, D0
		ror.w	x, D0
		or.b	D0, (A0)+
		rol.w	#8, D0
		or.b	D0, (A0)
		adda.w	D2, A0
		dbf	D1, @lp
	}
}


/*	function DRAW_DOT:  puts 2x2 dot on screen at x, y in black */
/*		Called to draw bullets: no longer
draw_dot(x, y)
register int x, y;
{
	/* note: the following if compiles to minimum size !! ?? 
      if( x < SCRWTH-1 && x >= 0 && y >= 0 && y < VIEWHT-1)
	asm
	{	
		add.w	#SBARHT, y	/* move to view area 
		
		FIND_WADDRESS(x, y)
		and.w	#15, x
		move.l	#0xC0000000, D0
		ror.l	x, D0
		or.l	D0, (A0)
		or.l	D0, 64(A0)
	}
}
*/


draw_dot_safe(x, y)
register int x, y;
{
	asm
	{	
		add.w	#SBARHT, y	/* move to view area */
		
		FIND_WADDRESS(x, y)
		and.w	#15, x
		move.l	#0xC0000000, D0
		ror.l	x, D0
		or.l	D0, (A0)
		or.l	D0, 64(A0)
	}
}



/*	function DRAW_SPARK:  same as draw_dot, but in white */
/*		Called to draw sparks in explosions */
/*		Could be written into explosion routine in future */
draw_spark_safe(x, y)
register int x, y;
{
	asm
	{	
		add.w	#SBARHT, y	/* move to view area */
		
		FIND_WADDRESS(x, y)
		and.w	#15, x
		move.l	#0x3FFFFFFF, D0
		ror.l	x, D0
		and.l	D0, (A0)
		and.l	D0, 64(A0)
	}
}


draw_shipshot(x, y)
register int x, y;
{
	static int filled[4] = {0x6000, 0xF000, 0xF000, 0x6000},
		empty[4] = {0x6000, 0x9000, 0x9000, 0x6000};
	static int rand = 1;
	extern char expl_rands[];
	register char *data;
	
	y += SBARHT;
	
	if (!--rand)
		rand = rint(63) + 64;
	asm
	{
		FIND_WADDRESS(x, y)
		and.w	#15, x
		sub.w	#16, x
		neg.w	x	/* x is left rot */
		lea	filled(A5), A1
		moveq	#3, D2
		
		lea	expl_rands(A5), data
		adda.w	rand(A5), data
		moveq	#3, D0
		and.b	(data), D0
		bra.s	@empty
		
	@full	moveq	#0, D0
		move.w	(A1)+, D0
		lsl.l	x, D0
		or.l	D0, (A0)
		adda.w	#64, A0
		dbra	D2, @full
		bra.s	@leave
		
	@empty	lea	empty(A5), data
	
	@eloop	moveq	#0, D0	/* filled version is mask */
		move.w	(A1)+, D0
		lsl.l	x, D0
		not.l	D0
		moveq	#0, D1
		move.w	(data)+, D1
		lsl.l	x, D1
		and.l	(A0), D0
		or.l	D1, D0
		move.l	D0, (A0)
		adda.w	#64, A0
		dbra	D2, @eloop
	@leave
	}
}


draw_digit(x, y, n, screen)
register int x, y;
register char *screen;
int n;
{
	register char *def;
	extern char *sbarptr;
	
	def = digits[n];
	asm
	{
		move.l	sbarptr(A5), A0
		asl.w	#6, y
		adda.w	y, screen
		adda.w	y, A0
		asr.w	#3, x
		adda.w	x, screen
		adda.w	x, A0
		moveq	#DIGHEIGHT/3-1, D2
		move.l	#64*3, y
		
	@loop:	move.b	(A0), D0
		move.b	(def)+, D1
		eor.b	D1, D0
		move.b	D0, (screen)
		move.b	64*1(A0), D0
		move.b	(def)+, D1
		eor.b	D1, D0
		move.b	D0, 64*1(screen)
		move.b	64*2(A0), D0
		move.b	(def)+, D1
		eor.b	D1, D0
		move.b	D0, 64*2(screen)
		
		adda.l	y, A0
		adda.l	y, screen
		dbra	D2, @loop
	}
}




draw_bunker(x, y, def)
register int x, y;
register char *def;	/* actually int */
{
	int height;
	
	if (x <= -48 || x >= SCRWTH)
		return;
	
	height = (VIEWHT - 1) - y;
	if (height > BUNKHT-1)
		height = BUNKHT-1;
	if (y < 0)
	{	def -= ((y << 1) + y) << 1;
		height += y;
		y = 0;
	}
	y += SBARHT;
	
	asm
	{
		movem.l	D3-D5, -(SP)
		JSR_WADDRESS
		
		moveq	#-1, D4	/* D4 is clip on left	*/
		moveq	#-1, D5	/* D5 is clip on right	*/
		cmp.w	#-32, x
		bge.s	@clip2
		not.l	D4
		move.l	#0x0000FFFF, D5
		bra.s	@drawit
	@clip2	cmp.w	#-16, x
		bge.s	@clip3
		not.l	D4
		bra.s	@drawit
	@clip3	tst.w	x
		bge.s	@clip4
		move.l	#0x0000FFFF, D4
		bra.s	@drawit
	@clip4	cmp.w	#SCRWTH-16, x
		blt.s	@clip5
		not.l	D5
		not.w	D4
		bra.s	@drawit
	@clip5	cmp.w	#SCRWTH-32, x
		blt.s	@clip6
		not.l	D5
		bra.s	@drawit
	@clip6	cmp.w	#SCRWTH-48, x
		blt.s	@drawit
		not.w	D5
		
	@drawit	and.w	#15, x	/* x is right rot */
		moveq	#16, y
		sub.w	x, y	/* y is left rot	*/
		moveq	#64, D2
		move.w	height(A6), D3
		blt	@leave
		lsl.l	x, D4
		lsr.l	y, D5	/*shift masks to clip early */
	
	@skip0s	adda.w	D2, A0
		moveq	#0, D0	/* skip early blank lines */
		move.w	(def)+, D0
		or.l	(def)+, D0
		dbne	D3, @skip0s
		beq	@leave
		subq.w	#6, def
		suba.w	D2, A0	
		
	@loop	move.l	(def), D0
		and.l	D4, D0
		beq.s	@onlyright
		addq.w	#2, def
		move.l	(def)+, D1
		and.l	D5, D1
		beq.s	@onlyleft

	@normal	lsr.l	x, D0	/* shift */
		lsl.l	y, D1
		eor.l	D0, (A0)	/* draw it */
		eor.l	D1, 4(A0)
	@nextline	adda.l	D2, A0
		dbf	D3, @loop
		bra.s	@leave
		
			/* special case when only right word is non-zero */
	@onlyright
		addq.w	#2, def	/* skip left word */
		move.l	(def)+, D1
		and.l	D5, D1
		beq.s	@nextline
		lsl.l	y, D1	/* shift */
		eor.l	D1, 4(A0)	/* draw it */
		adda.l	D2, A0	/* next line */
		dbf	D3, @loop
		bra.s	@leave
		
			/* special case when only left word is non-zero */
	@onlyleft
		lsr.l	x, D0	/* shift */
		eor.l	D0, (A0)	/* draw it */
		adda.l	D2, A0	/* next line */
		dbf	D3, @loop
		
	@leave
		movem.l	(SP)+, D3-D5
	}
}


full_bunker(x, y, def, mask)
register int x, y;
register char *def, *mask;	/* actually int */
{
	int height;
	
	if (x <= -48 || x >= SCRWTH)
		return;
	
	height = (VIEWHT - 1) - y;
	if (height > BUNKHT-1)
		height = BUNKHT-1;
	if (y < 0)
	{	def -= ((y << 1) + y) << 1;
		mask -= ((y << 1) + y) << 1;
		height += y;
		y = 0;
	}
	y += SBARHT;
	
	asm
	{
		movem.l	D3-D5, -(SP)
		JSR_WADDRESS
		
		moveq	#-1, D4	/* D4 is clip on left	*/
		moveq	#-1, D5	/* D5 is clip on right	*/
		cmp.w	#-32, x
		bge.s	@clip2
		not.l	D4
		move.l	#0x0000FFFF, D5
		bra.s	@drawit
	@clip2	cmp.w	#-16, x
		bge.s	@clip3
		not.l	D4
		bra.s	@drawit
	@clip3	tst.w	x
		bge.s	@clip4
		move.l	#0x0000FFFF, D4
		bra.s	@drawit
	@clip4	cmp.w	#SCRWTH-16, x
		blt.s	@clip5
		not.l	D5
		not.w	D4
		bra.s	@drawit
	@clip5	cmp.w	#SCRWTH-32, x
		blt.s	@clip6
		not.l	D5
		bra.s	@drawit
	@clip6	cmp.w	#SCRWTH-48, x
		blt.s	@drawit
		not.w	D5
		
	@drawit	and.w	#15, x	/* x is right rot */
		moveq	#16, y
		sub.w	x, y	/* y is left rot	*/
		moveq	#64, D2
		move.w	height(A6), D3
		blt	@leave
	
	@skip0s	adda.w	D2, A0
		addq.w	#6, def
		moveq	#0, D0	/* skip early blank lines */
		move.w	(mask)+, D0
		or.l	(mask)+, D0
		dbne	D3, @skip0s
		beq	@leave
		move.w	D3, height(A6)
		subq.w	#6, mask
		subq.w	#6, def
		suba.w	D2, A0
		
	@loop	move.l	(mask)+, D0
		beq.s	@onlyright
		move.w	D0, D2
		lsr.l	x, D0
		and.l	D4, D0
		not.l	D0
		and.l	(A0), D0
		move.l	(def)+, D1
		move.w	D1, D3
		lsr.l	x, D1
		and.l	D4, D1
		or.l	D1, D0
		move.l	D0, (A0)+
		
		swap	D2
		move.w	(mask)+, D2
	@continue	lsl.l	y, D2
		and.l	D5, D2
		not.l	D2
		and.l	(A0), D2
		swap	D3
		move.w	(def)+, D3
		lsl.l	y, D3
		and.l	D5, D3
		or.l	D3, D2
		move.l	D2, (A0)
		
	@nextline	adda.w	#64-4, A0
		subq.w	#1, height(A6)
		bge.s	@loop
		bra.s	@leave
		
			/* special case when only right word is non-zero */
	@onlyright
		addq.w	#4, def	/* skip left longword */
		addq.w	#4, A0
		moveq	#0, D2
		moveq	#0, D3
		move.w	(mask)+, D2
		bne.s	@continue	/* if 0 in mask, quit */
	@leave
		movem.l	(SP)+, D3-D5
	}
}


draw_nline(x, y, len, u_d)
register int x, y;
int len, u_d  /* not used */;
{
	int mask;
	
	if (u_d == 4567)
		mask = 1 << 15;
	else if ((x & 0x000F) == 15)
	{
		if (x < SCRWTH-1)
			draw_nline(x+1, y, len, 4567);
		mask = 1;
	}
	else
		mask = (3 << (14 - (x & 0x000F)));
	asm
	{
		movem.l	D3-D5, -(SP)
		JSR_WADDRESS
		andi.w	#15, x
		move.w	mask(A6), D0 /* D0 holds or mask */
		
		move.w	#64, D2
		move.w	#64*8, D3
		move.w	len(A6), D4
		move.w	D4, D5
		and.w	#7, D4
		asr.w	#3, D5
		subq.w	#1, D5
		blt	@loop2

	@loop1	or.w	D0, (A0)
		or.w	D0, 64*1(A0)
		or.w	D0, 64*2(A0)
		or.w	D0, 64*3(A0)
		or.w	D0, 64*4(A0)
		or.w	D0, 64*5(A0)
		or.w	D0, 64*6(A0)
		or.w	D0, 64*7(A0)
		adda.w	D3, A0
		dbf	D5, @loop1
		
	@loop2	or.w	D0, (A0)
		adda.w	D2, A0
		dbf	D4, @loop2
		
		movem.l	(SP)+, D3-D5
	}
}



draw_nneline(x, y, len, dir)
register int x, y;
int len, dir;
{
	if (x + (len >> 1) + 1 >= SCRWTH)
		len -= 1 + (len & 0x0001);
	asm
	{
		movem.l	D3, -(SP)
		JSR_BADDRESS
		andi.w	#7, x
		move.w	#3<<6, D0
		lsr.b	x, D0	/* D0 holds or mask */
		
		move.w	#64, D2
		NEGIFNEG	(D2, dir(A6))
		move.w	len(A6), D3
		
	@drawit	cmp.w	#7, x	/* at end of byte, so do it */
		beq	@skip_pre
		
	@preloop	or.b	D0, (A0)
		adda.w	D2, A0
		subq.w	#1, D3
		blt	@leave
		
		or.b	D0, (A0)
		adda.w	D2, A0
		ror.b	#1, D0
		dbcs	D3, @preloop
		
		subq.w	#1, D3	/* dbcc missed this! */
		blt	@leave
		
	@skip_pre	
		moveq	#0x80-0x100, D0
		or.b	#1, (A0)	/* 2 cross-byte dots */
		or.b	D0, 1(A0)
		adda.w	D2, A0
		subq.w	#1, D3
		blt	@leave
		or.b	#1, (A0)	/* another 2 c-b dots */
		or.b	D0, 1(A0)
		adda.w	D2, A0
		subq.w	#1, D3
		blt	@leave
		
		addq.w	#1, A0
		tst.w	D2
		blt	@enteruplp
		bra	@enterdnlp
		
	@uploop	moveq	#0xC0-0x100, D0
		or.b	D0, (A0)
		or.b	D0, -64*1(A0)
		moveq	#0x60, D0
		or.b	D0, -64*2(A0)
		or.b	D0, -64*3(A0)
		moveq	#0x30, D0
		or.b	D0, -64*4(A0)
		or.b	D0, -64*5(A0)
		moveq	#0x18, D0
		or.b	D0, -64*6(A0)
		or.b	D0, -64*7(A0)
		moveq	#0x0C, D0
		or.b	D0, -64*8(A0)
		or.b	D0, -64*9(A0)
		moveq	#0x06, D0
		or.b	D0, -64*10(A0)
		or.b	D0, -64*11(A0)
		moveq	#0x03, D0
		or.b	D0, -64*12(A0)
		or.b	D0, -64*13(A0)
		moveq	#0x01, D0
		or.b	D0, -64*14(A0)
		or.b	#1<<7, -64*14+1(A0)
		or.b	D0, -64*15(A0)
		or.b	#1<<7, -64*15+1(A0)
		suba.w	#64*16-1, A0
	@enteruplp	sub.w	#16, D3
		bge	@uploop
		bra	@post
		
	@dnloop	moveq	#0xC0-0x100, D0
		or.b	D0, (A0)
		or.b	D0, 64*1(A0)
		moveq	#0x60, D0
		or.b	D0, 64*2(A0)
		or.b	D0, 64*3(A0)
		moveq	#0x30, D0
		or.b	D0, 64*4(A0)
		or.b	D0, 64*5(A0)
		moveq	#0x18, D0
		or.b	D0, 64*6(A0)
		or.b	D0, 64*7(A0)
		moveq	#0x0C, D0
		or.b	D0, 64*8(A0)
		or.b	D0, 64*9(A0)
		moveq	#0x06, D0
		or.b	D0, 64*10(A0)
		or.b	D0, 64*11(A0)
		moveq	#0x03, D0
		or.b	D0, 64*12(A0)
		or.b	D0, 64*13(A0)
		moveq	#0x01, D0
		or.b	D0, 64*14(A0)
		or.b	#1<<7, 64*14+1(A0)
		or.b	D0, 64*15(A0)
		or.b	#1<<7, 64*15+1(A0)
		adda.w	#64*16+1, A0
	@enterdnlp	sub.w	#16, D3
		bge	@dnloop
		
	@post	add.w	#16, D3
		moveq	#0xC0-0x100, D0
	@postloop	or.b	D0, (A0)
		adda.w	D2, A0
		subq.w	#1, D3
		blt.s	@leave
		
		or.b	D0, (A0)
		adda.w	D2, A0
		lsr.b	#1, D0
		dbf	D3, @postloop
		
		tst.b	D0
		bne.s	@leave
		suba.w	D2, A0
		or.b	#0x80, 1(A0)
		suba.w	D2, A0
		or.b	#0x80, 1(A0)
		
	@leave
		movem.l	(SP)+, D3
	}
}



draw_neline(x, y, len, dir)
register int x, y;
int len, dir;
{
	if (x + len + 1 >= SCRWTH)
		len--;
	asm
	{
		movem.l	D3-D5, -(SP)
		JSR_BADDRESS
		andi.w	#7, x
		move.b	#3<<6, D0
		lsr.b	x, D0		/* D0 holds or mask	*/
		move.w	len(A6), D3
		blt	@leave
		
		move.w	#64, D1
		move.w	#64*8, D2
		tst.w	dir(A6)	/* set for up or down	*/
		bgt	@start
		neg.w	D1
		neg.w	D2
		
	@start	addq.w	#1, D2	/* step to right		*/
		cmp.b	#1, D0	/* if at end, skip pre */
		beq.s	@skippre
		
	@preloop	or.b	D0, (A0)
		adda.w	D1, A0
		lsr.b	#1, D0
		dbcs	D3, @preloop
		subq.w	#1, D3	/* dbcc missed this! */
		blt	@leave
		
	@skippre	or.b	D0, (A0)
		addq.w	#1, A0
		bset	#7, (A0)
		adda.w	D1, A0
		subq.w	#1, D3
		blt	@leave
		
		move.w	D3, D4
		and.w	#7, D3
		asr.w	#3, D4
		subq.w	#1, D4	/* D4 is times thru big */
		blt.s	@post
		tst.w	dir(A6)
		blt.s	@uploop
		
	@dnloop	or.b	#0xC0, (A0)
		or.b	#0x60, 64*1(A0)
		or.b	#0x30, 64*2(A0)
		or.b	#0x18, 64*3(A0)
		or.b	#0x0C, 64*4(A0)
		or.b	#0x06, 64*5(A0)
		or.b	#0x03, 64*6(A0)
		or.b	#0x01, 64*7(A0)
		or.b	#0x80, 64*7+1(A0)
		adda.w	D2, A0
		dbf	D4, @dnloop
		bra	@post
		
	@uploop	or.b	#0xC0, (A0)
		or.b	#0x60, -64*1(A0)
		or.b	#0x30, -64*2(A0)
		or.b	#0x18, -64*3(A0)
		or.b	#0x0C, -64*4(A0)
		or.b	#0x06, -64*5(A0)
		or.b	#0x03, -64*6(A0)
		or.b	#0x01, -64*7(A0)
		or.b	#0x80, -64*7+1(A0)
		adda.w	D2, A0
		dbf	D4, @uploop
		
	@post	move.w	#0x00C0, D0
	@postloop	or.b	D0, (A0)
		adda.w	D1, A0
		ror.w	#1, D0
		dbcs	D3, @postloop
		subq.w	#1, D3
		blt.s	@leave
		or.b	D0, (A0)
		addq.w	#1, A0
		rol.w	#8, D0
		bra.s	@postloop
		
	@leave	movem.l	(SP)+, D3-D5
	}
}



draw_eneline(x, y, len, dir)
register int x, y;
int len, dir;
{
	/* keep double width from overwriting bottom or top of screen */
	if ((dir == L_DN && y + (len >> 1) >= SCRHT - 1) ||
	    (dir == L_UP && y - (len >> 1) <= SBARHT))
		len -= 1 + (len & 0x0001);
	asm
	{
		movem.l	D3-D5, -(SP)
		JSR_WADDRESS
		movea.l	A0, A1	/* save starting address */
		move.w	x, D5	/* save x value for later */
		
		move.w	len(A6), D3
		subq.w	#1, D3	/* ensure no extra dot at end */
		blt	@leave
		asr.w	#1, D3	/* divide by two	*/
		
	/* draw the last 2 dots, then restore and start over again */		
		move.w	D3, D2
		asl.w	#1, D2
		add.w	D2, x	/* ending x value */
		tst.w	dir(A6)
		bgt.s	@down
		sub.w	D3, y
		subq.w	#1, y
		bra.s	@addr	
	@down	add.w	D3, y
		addq.w	#1, y
	@addr	JSR_WADDRESS	/* end address */
		andi.w	#15, x
		move.l	#0xC0000000, D0
		ror.l	x, D0
		or.l	D0, (A0)	/* draw the last 2 dots */
		
		moveq	#64, D1
		NEGIFNEG	(D1, dir(A6))
		
		move.w	D5, x	/* restore x */
		movea.l	A1, A0	/* restore starting address */
		andi.w	#15, x
		move.l	#0xC0000000, D0
		ror.l	x, D0	/* D0 holds or mask */
		or.l	D0, (A0)	/* first 2 dots special */
		adda.w	D1, A0
		subq.w	#1, D3	/* last 2 dots already done */
		blt	@leave
		
		move.l	#0xF0000000, D0
		ror.l	x, D0	/* D0 holds or mask */
		
		move.w	D3, D4
		and.w	#3, D3
		asr.w	#2, D4
		subq.w	#1, D4
		blt	@postloop
		
		tst.w	dir(A6)
		blt	@uploop
		
	@downloop	or.l	D0, (A0)
		ror.l	#2, D0
		or.l	D0, 64*1(A0)
		ror.l	#2, D0
		or.l	D0, 64*2(A0)
		ror.l	#2, D0
		or.l	D0, 64*3(A0)
		ror.l	#2, D0
		adda.w	#64*4, A0
		tst.b	D0
		beq.s	@1
		swap	D0
		addq.w	#2, A0
	@1	dbf	D4, @downloop
		bra.s	@postloop
		
	@uploop	or.l	D0, (A0)
		ror.l	#2, D0
		or.l	D0, -64*1(A0)
		ror.l	#2, D0
		or.l	D0, -64*2(A0)
		ror.l	#2, D0
		or.l	D0, -64*3(A0)
		ror.l	#2, D0
		suba.w	#64*4, A0
		tst.b	D0
		beq.s	@2
		swap	D0
		addq.w	#2, A0
	@2	dbf	D4, @uploop
		
	@postloop	or.l	D0, (A0)
		adda.w	D1, A0
		ror.l	#2, D0
		dbf	D3, @postloop

	@leave	movem.l	(SP)+, D3-D5
	}
}



draw_eline(x, y, len, u_d)
register int x, y;
int len, u_d  /* not used */;
{
	long lower = 0xFFFFFFFF;
	
	if (y + 1 >= SCRHT)
		lower = 0L;
	asm
	{
		movem.l	D3-D5, -(SP)
		JSR_WADDRESS
		move.w	len(A6), D5
		andi.w	#15, x
		move.w	x, D0
		add.w	D5, D0
		cmpi.w	#16, D0
		bge.s	@normal
		moveq	#-1, D1	/* deal with real short */
		lsr.w	#1, D1
		lsr.w	D5, D1
		ror.w	x, D1
		not.w	D1
		or.w	D1, (A0)
		tst.w	lower(A6)
		beq.s	@leave
		or.w	D1, 64(A0)
		bra.s	@leave
		
	@normal	moveq	#-1, D1
		lsr.w	x, D1
		tst.w	lower(A6)
		beq.s	@1
		or.w	D1, 64(A0)
	@1	or.w	D1, (A0)+
		subi.w	#15, D5
		add.w	x, D5
		moveq	#-1, D1
		move.l	lower(A6), D0
		
	@loop	subi.w	#32, D5
		blt.s	@lastlw
		or.l	D0, 64(A0)
		move.l	D1, (A0)+
		bra.s	@loop

	@lastlw	addi.w	#32, D5
		moveq	#-1, D1
		lsr.l	D5, D1
		not.l	D1
		and.l	D1, D0
		or.l	D0, 64(A0)
		or.l	D1, (A0)
		
	@leave	movem.l	(SP)+, D3-D5
	}
}



set_screen(screen, color)
char *screen;
long color;
{
	asm
	{
		move.l	screen(A6), A0
		adda.w	#SBARSIZE, A0
		move.w	#VIEWSIZE/4-1, D1
		move.l	color(A6), D0
		
	@loop	move.l	D0, (A0)+
		dbra	D1, @loop
	}
}


sbar_clear(screen)
register char *screen;
{
	register char *sbardata = sbarptr;
	
	asm{
		move.w	#SBARSIZE/4-1, D1
	@loop	move.l	(sbardata)+, (screen)+
		dbf	D1, @loop
	}
}


view_clear(screen)
char *screen;
{
	long bgr1, bgr2;
	extern int screenx, screeny;
	extern long backgr1, backgr2;
	
	if ((screenx + screeny) & 1)
	{
		bgr1 = backgr2;
		bgr2 = backgr1;
	}
	else
	{
		bgr1 = backgr1;
		bgr2 = backgr2;
	}
	background[0] = bgr1;
	background[1] = bgr2;
	
	asm{
		movem.l	D3-D7/A2-A6, -(SP)
		subq.w	#4, SP
		move.l	screen(A6), A0
		
		move.l	bgr1(A6), D0
		move.l	D0, D1
		move.l	D0, D2
		move.l	D0, D3
		move.l	D0, D4
		move.l	D0, D5
		move.l	D0, D6
		move.l	D0, D7
		move.l	bgr2(A6), A1
		move.l	A1, A2
		move.l	A1, A3
		move.l	A1, A4
		move.l	A1, A5
		move.l	A1, A6
		
		adda.l	#SCRSIZE, A0 /* Move to end of buffer */
		move.w	#(VIEWHT-6)/12-1, (SP)
		
	@loop	movem.l	A1-A6, -(A0)
		movem.l	A1-A6, -(A0)
		movem.l	A1-A4, -(A0)
		movem.l	D0-D7, -(A0)
		movem.l	D0-D7, -(A0)
		movem.l	A1-A6, -(A0)
		movem.l	A1-A6, -(A0)
		movem.l	A1-A4, -(A0)
		movem.l	D0-D7, -(A0)
		movem.l	D0-D7, -(A0)
		movem.l	A1-A6, -(A0)
		movem.l	A1-A6, -(A0)
		movem.l	A1-A4, -(A0)
		movem.l	D0-D7, -(A0)
		movem.l	D0-D7, -(A0)
		movem.l	A1-A6, -(A0)
		movem.l	A1-A6, -(A0)
		movem.l	A1-A4, -(A0)
		movem.l	D0-D7, -(A0)
		movem.l	D0-D7, -(A0)
		movem.l	A1-A6, -(A0)
		movem.l	A1-A6, -(A0)
		movem.l	A1-A4, -(A0)
		movem.l	D0-D7, -(A0)
		movem.l	D0-D7, -(A0)
		movem.l	A1-A6, -(A0)
		movem.l	A1-A6, -(A0)
		movem.l	A1-A4, -(A0)
		movem.l	D0-D7, -(A0)
		movem.l	D0-D7, -(A0)
		
		subq.w	#1, (SP)
		bge	@loop
		
		movem.l	A1-A6, -(A0)
		movem.l	A1-A6, -(A0)
		movem.l	A1-A4, -(A0)
		movem.l	D0-D7, -(A0)
		movem.l	D0-D7, -(A0)
		movem.l	A1-A6, -(A0)
		movem.l	A1-A6, -(A0)
		movem.l	A1-A4, -(A0)
		movem.l	D0-D7, -(A0)
		movem.l	D0-D7, -(A0)
		movem.l	A1-A6, -(A0)
		movem.l	A1-A6, -(A0)
		movem.l	A1-A4, -(A0)
		movem.l	D0-D7, -(A0)
		movem.l	D0-D7, -(A0)
		
		addq.w	#4, SP
		movem.l	(SP)+, D3-D7/A2-A6
	}
}


copy_view(from, to)
register char *from, *to;
{
	asm
	{
		movem.l	D3-D7, -(SP)
		adda.w	#SCRSIZE-32, from
		adda.w	#SCRSIZE, to
		move.w	#64, D1
		move.w	#VIEWHT/2-1, D0
		
	@loop	movem.l	(from)+, D2-D7/A0-A1
		movem.l	D2-D7/A0-A1, -(to)
		suba.w	D1, from
		movem.l	(from)+, D2-D7/A0-A1
		movem.l	D2-D7/A0-A1, -(to)
		suba.w	D1, from
		movem.l	(from)+, D2-D7/A0-A1
		movem.l	D2-D7/A0-A1, -(to)
		suba.w	D1, from
		movem.l	(from)+, D2-D7/A0-A1
		movem.l	D2-D7/A0-A1, -(to)
		suba.w	D1, from
		
		dbra	D0, @loop
		
		movem.l	(SP)+, D3-D7
	}
}



clear_point(x, y)
register int x, y;
{
	asm
	{	
		add.w	#SBARHT, y	/* move to view area */
		
		JSR_WADDRESS
		and.w	#15, x
		move.w	#0x7FFF, D0
		ror.w	x, D0
		and.w	D0, (A0)
	}
}



crack()
{
	asm
	{
		move.l	front_screen(A5), A0
		adda.w	#SBARSIZE, A0
		move.w	#VIEWSIZE/4/4-1, D1
		moveq	#-1, D0
	@loop	eor.l	D0, (A0)+
		eor.l	D0, (A0)+
		eor.l	D0, (A0)+
		eor.l	D0, (A0)+
		dbf	D1, @loop
	}
}


/* FIZZ:  does a fast "random" fizz from FROM to TO screens.  Uses a
    random number generator known to go through all 2^n numbers once
    before repeating.  Used to fizz a finished planet to star pattern.
    See Knuth's algorithm books for the random number algorithm.
*/
fizz(from, to)
register char *from, *to;
{
	register long seed;
	
	from += SBARSIZE;
	to += SBARSIZE;
	
	asm {
		movem.l	D3-D5, -(SP)
		move.w	#2048-10, D5
		moveq	#13, D4	/* for bit testing */
		move.w	#4357, seed
		
	@loop	cmp.w	#8192-40, seed
		bge.s	@skip
		moveq	#9, D3
		cmp.w	#8040, seed
		blt.s	@1
		moveq	#8, D3
	@1	move.l	from, A0
		move.l	to, A1
		move.w	seed, D0
		lsr.w	#3, D0
		lsl.w	#1, D0
		adda.w	D0, A0
		adda.w	D0, A1
		move.w	seed, D0
		and.w	#7, D0
		move.w	#0x8080, D2	/* same bit in 2 bytes */
		lsr.w	D0, D2
		move.w	D2, D1
		not.w	D1
		
	@inner	move.w	D2, D0
		and.w	(A0), D0
		and.w	D1, (A1)
		or.w	D0, (A1)
		
		adda.w	D5, A0
		adda.w	D5, A1
		dbra	D3, @inner
		
	@skip	asl.w	#1, seed
		btst	D4, seed
		beq	@loop	/* can't be 4357 yet */
		eor.w	#4287, seed	/* a real magic number! */
		and.w	#0x1FFF, seed
		cmp.w	#4357, seed
		bne.s	@loop
		
		movem.l	(SP)+, D3-D5
	}
}


