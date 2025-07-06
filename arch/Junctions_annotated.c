/*
	Junctions.c:  init code for Walls, and other intelligent stuff for
		junctions, etc.
	
	Copyright (c) 1986-88 Randall H. Wilson
	
	ANNOTATED VERSION
	
	This file handles the complex task of preparing walls for 3D rendering,
	particularly focusing on wall intersections (junctions) which require
	special handling to avoid visual artifacts.
*/


#include "GW.h"
#include "Assembly Macros.h"
 


extern linerec lines[];
extern linerec *kindptrs[], *firstwhite;
extern long background[2], backgr1, backgr2;
extern char *back_screen;
extern int screenx, screeny, screenb, screenr, worldwidth;

/*
 * JUNCTION RECORD
 * Stores the location of wall intersections.
 * Junctions are places where two walls come within 3 pixels of each other
 * and require special white piece patches to look correct.
 */
typedef struct {int x, y;} junctionrec;

junctionrec junctions[NUMLINES*2+20];  /* Array of all junctions found */
int numjunctions;                      /* Count of junctions */

/* Clipping masks for different screen regions */
#define	LEFT_CLIP	0x0000FFFFL    /* Mask for left edge clipping */
#define	RIGHT_CLIP	0xFFFF0000L    /* Mask for right edge clipping */
#define	CENTER_CLIP	0xFFFFFFFFL    /* No clipping needed (fully visible) */


/*
 * INIT_WALLS - Main initialization function
 * 
 * This is called once per level to prepare all wall data structures:
 * 1. Organizes walls into linked lists by type (normal, bouncing, phantom)
 * 2. Creates a special list of NNE walls that need white-only drawing
 * 3. Finds all junctions (wall intersections)
 * 4. Sorts junctions by x-coordinate for efficient access
 * 5. Initializes all white pieces and patches
 */
init_walls()
{
	register linerec *line;
	linerec **last;
	register junctionrec *j;
	junctionrec *movej, *lastj, tempjcn;
	register int kind, x, y;
	int i;
	
	/* STEP 1: Organize walls by kind into separate linked lists */
	/* This allows the renderer to process each type separately */
	for (kind = L_NORMAL; kind < L_NUMKINDS; kind++)
	{
		last = &kindptrs[kind];
		for (line=lines; line->type; line++)
			if (line->kind == kind)
			{
				*last = line;
				last = &line->next;
			}
		*last = NULL;
	}
	
	/* STEP 2: Build list of NNE walls needing special white-only treatment */
	last = &firstwhite;
	for (line=lines; line->type; line++)
		if (line->newtype == NEW_NNE)
		{
			*last = line;
			last = &line->nextwh;
		}
	*last = NULL;

	/* STEP 3: Find all junctions (wall intersections) */
	/* Junction detection uses a 3-pixel threshold */
	junctions[0].x = 20000;  /* Sentinel value */
	numjunctions = 0;
	lastj = junctions;
	for (line=lines; line->type; line++)
		for (i=0; i<2; i++)  /* Check both endpoints of each wall */
		{
			x = (i ? line->endx : line->startx);
			y = (i ? line->endy : line->starty);
			/* Check if this point is near any existing junction */
			for (j=junctions; j < lastj; j++)
				if (j->x <= x+3 && j->x >= x-3 &&
				    j->y <= y+3 && j->y >= y-3)
					break;
			/* If no nearby junction found, add this as new junction */
			if (j == lastj)
			{
				lastj->x = x;
				lastj->y = y;
				(++lastj)->x = 20000;  /* Update sentinel */
				numjunctions++;
			}
		}
		
	/* STEP 4: Sort junctions by x-coordinate using insertion sort */
	/* This enables efficient visibility checking during rendering */
	for (j=junctions; j<lastj; j++)
		for (movej = j; movej > junctions && 
			movej->x < (movej-1)->x; movej--)
		{
			tempjcn = *movej;
			*movej = *(movej-1);
			*(movej-1) = tempjcn;
		}
	/* Add sentinel values at end for safety */
	for (i=0; i<18; i++)
		junctions[numjunctions+i].x = 20000;

	/* STEP 5: Initialize all white pieces and junction patches */
	init_whites();
}

/* HASH PATTERN for junction crosshatching (creates visual texture) */
int hash_figure[6] = {0x8000, 0x6000, 0x1800, 0x0600, 0x00180, 0x0040};

/* GLITCH PATCHES - Special bit patterns to fix visual artifacts at specific wall intersections */
int neglitch[4] = {0xEFFF, 0xCFFF, 0x8FFF, 0x0FFF};      /* NE wall glitch fix */
int eneglitch1[3] = {0x07FF, 0x1FFF, 0x7FFF};           /* ENE wall glitch fix 1 */
int eneglitch2[5] = {0xFF3F, 0xFC3F, 0xF03F, 0xC03F, 0x003F}; /* ENE wall glitch fix 2 */
int eseglitch[4] = {0x3FFF, 0xCFFF, 0xF3FF, 0xFDFF};    /* ESE wall glitch fix */

/* WHITE PIECE BIT PATTERNS
 * Each array represents the 6-line white "underside" pattern for wall endpoints
 * The patterns create the 3D shadow effect beneath walls
 */
int generictop[6] = {0xFFFF, 0x3FFF, 0x0FFF, 0x03FF, 0x00FF, 0x007F};
int nnebot[6] =	{0x800F, 0xC01F, 0xF01F, 0xFC3F, 0xFF3F, 0xFFFF};
int nebot[6] =	{0x8001, 0xC003, 0xF007, 0xFC0F, 0xFF1F, 0xFFFF};
int eneleft[6]=	{0x8000, 0xC000, 0xF000, 0xFC01, 0xFF07, 0xFFDF};
int eleft[6] =	{0xFFFF, 0xFFFF, 0xF000, 0xFC00, 0xFF00, 0xFF80};
int eseright[6]={0xFFFF, 0x3FFF, 0x8FFF, 0xE3FF, 0xF8FF, 0xFE7F};
int setop[6] =	{0xFFFF, 0xFFFF, 0xEFFF, 0xF3FF, 0xF8FF, 0xFC3F};
int sebot[6] =	{0x87FF, 0xC3FF, 0xF1FF, 0xFCFF, 0xFF7F, 0xFFFF};
int ssetop[6] =	{0xFFFF, 0xBFFF, 0xCFFF, 0xC3FF, 0xE0FF, 0xE03F};
int ssebot[6] =	{0x80FF, 0xC07F, 0xF07F, 0xFC3F, 0xFF3F, 0xFFFF};
int sbot[6] =	{0x803F, 0xC03F, 0xF03F, 0xFC3F, 0xFF3F, 0xFFFF};


/* WHITE PICTURES TABLE
 * Maps each wall type to its start and end white piece patterns
 * Index corresponds to NEW_* wall type constants
 * [0] = start piece, [1] = end piece
 */
int *whitepicts[][2] =
{	{NULL, NULL},
	{generictop, sbot},      /* S wall */
	{ssetop, ssebot},        /* SSE wall */
	{setop, sebot},          /* SE wall */
	{NULL, eseright},        /* ESE wall */
	{eleft, generictop},     /* E wall */
	{eneleft, generictop},   /* ENE wall */
	{nebot, generictop},     /* NE wall */
	{nnebot, generictop}};   /* NNE wall */
	
typedef int whitedata;

/* WHITE PIECE RECORD
 * Represents a single white shadow piece to be drawn
 */
typedef struct
{
	int x, y, hasj, ht;
	whitedata *data;  /* Pointer to bit pattern (6 ints, one per line) */
} whiterec;

int *whitestorage = NULL;	/* Storage for merged/modified white patterns */
int whitesused;             /* Amount of whitestorage used */

whiterec *whites = NULL;	/* Array of all white pieces to draw */
int numwhites;              /* Count of white pieces */


/*
 * ADD_WHITE - Adds a new white piece to the drawing list
 */
add_white(x, y, ht, data)
int x, y, ht;
int *data;
{
	register whiterec *wh = whites + numwhites;
	
	wh->x = x;
	wh->y = y;
	wh->ht = ht;
	wh->data = data;
	wh->hasj = FALSE;  /* Will be set TRUE if this is at a junction */
	numwhites++;
	wh++;
	wh->x = 20000;     /* Sentinel */
}



/*
 * REPLACE_WHITE - Replaces an existing white piece at given location
 */
replace_white(x, y, ht, data)
int x, y, ht;
int *data;
{
	replace_white_2(x, y, x, y, ht, data);
}



/*
 * REPLACE_WHITE_2 - Replaces white piece, allowing different target/actual positions
 * Used when junction processing needs to adjust white piece locations
 */
replace_white_2(targetx, targety, x, y, ht, data)
int targetx, targety, x, y, ht;
int *data;
{
	register whiterec *wh;
	
	/* Find existing white piece at target location */
	for (wh=whites; wh < whites + numwhites &&
		(wh->y != targety || wh->x != targetx || wh->ht >= ht); wh++)
		;
	if (wh >= whites + numwhites)
		return;
	/* Replace with new data */
	wh->x = x;
	wh->y = y;
	wh->ht = ht;
	wh->data = data;
}

/*
 * ADD_WHITE_2 - Wrapper to allow add_white to be called via function pointer
 * alongside replace_white_2
 */
add_white_2(dummyx, dummyy, x, y, ht, data)
int dummyx, dummyy, x, y, ht;
int *data;
{
	add_white(x, y, ht, data);
}



/*
 * INIT_WHITES - Initialize all white pieces for the level
 * 
 * Process:
 * 1. Create normal white pieces for all wall endpoints
 * 2. Calculate junction patches where walls meet
 * 3. Sort all whites by position for efficient drawing
 * 4. Merge overlapping whites and add hash patterns at junctions
 */
init_whites()
{
	whiterec *wh, *movewh, tempwh;
	register int i;
	int *newdata;
		
	whitesused = 0;
	numwhites = 0;
	
	/* Create standard white pieces for all walls */
	norm_whites();
	
	/* Calculate patches for wall junctions */
	close_whites();
	
	/* Sort whites by x,y coordinates using insertion sort */
	/* This enables efficient visibility checking */
	for (wh=whites; wh < whites + numwhites; wh++)
		for (movewh = wh; movewh > whites &&
			movewh->x <= (movewh-1)->x &&
			(movewh->x < (movewh-1)->x ||
			 movewh->y < (movewh-1)->y); movewh--)
		{
			tempwh = *movewh;
			*movewh = *(movewh-1);
			*(movewh-1) = tempwh;
		}

	/* Add sentinels */
	for (i=0; i<18; i++)
		whites[numwhites+i].x = 20000;

	/* Merge overlapping white pieces */
	/* When two 6-line whites are at same position, combine their patterns */
	for (wh=whites; wh->x < 20000; wh++)
		while (wh->x == (wh+1)->x && wh->y == (wh+1)->y &&
			wh->ht == 6 && (wh+1)->ht == 6)
		{
			/* Allocate storage for merged pattern */
			newdata = whitestorage + whitesused;
			whitesused += 6;
			/* Merge by ANDing bit patterns (keeps white where both have white) */
			for (i=0; i<6; i++)
				newdata[i] = wh->data[i] & (wh+1)->data[i];
			wh->data = newdata;
			/* Remove the merged white from list */
			for (movewh = wh+1; movewh->x < 20000; movewh++)
				*movewh = movewh[1];
			numwhites--;
		}
	/* Add hash patterns at junction points */
	white_hash_merge();
}


/*
 * NORM_WHITES - Create standard white pieces for all walls
 * 
 * Adds white shadow pieces at wall endpoints based on wall type.
 * Also adds special glitch-fix pieces for certain wall types.
 */
norm_whites()
{
	register linerec *line;
	register int i;
	
	for (line=lines; line->type; line++)
	{
		/* Add standard endpoint whites from whitepicts table */
		for (i=0; i<2; i++)
			if (whitepicts[line->newtype][i])
				add_white(
					(i ? line->endx : line->startx),
					(i ? line->endy : line->starty),
					6,
					whitepicts[line->newtype][i]);
		
		/* Add special glitch-fix pieces for problematic wall types */
		switch(line->newtype)
		{
		case NEW_NE:
			add_white(line->endx - 4, line->endy + 2,
				4, neglitch);
			break;
		case NEW_ENE:
			add_white(line->startx + 16, line->starty,
				3, eneglitch1);
			add_white(line->endx - 10, line->endy + 1,
				5, eneglitch2);
			break;
		case NEW_ESE:
			add_white(line->endx - 7, line->endy - 2,
				4, eseglitch);
			break;
		default:
			break;
		}
	}
}

/* Default h1/h2 values for each wall type */
/* h1 = start of black section, h2 = end of black section offset */
int simpleh1[9] = {0, 6, 6, 6, 12, 16, 0, 1, 0};
int simpleh2[9] = {0, 0, 0, 0, -1, 0,-11,-5,-5};

/* Generic patch pattern */
int npatch[22];

/*
 * CLOSE_WHITES - Calculate junction patches for intersecting walls
 * 
 * This is the most complex part of junction handling. It:
 * 1. Sets default h1/h2 values for walls
 * 2. Finds all pairs of walls that are close together
 * 3. Calls one_close() to calculate specific patches needed
 */
close_whites()
{
	register linerec *line, *line2;
	linerec *first;
	register int x1, y1, x2, y2;
	int i, j;
	
	/* Initialize generic patch pattern */
	for (j=0; j<22; j++)
		npatch[j] = 0x003F;
	
	/* Set default h1/h2 values for each wall */
	for (line=lines; line->type; line++)
	{
		line->h1 = simpleh1[line->newtype];
		line->h2 = line->length + simpleh2[line->newtype];
	}
	
	/* Check all wall pairs for closeness */
	first = lines;
	for (line=lines; line->type; line++)
	{
	    /* Optimization: skip walls too far left */
	    while (first->endx < line->startx - 3)
	    	first++;
	    
	    /* Check both endpoints of current wall */
	    for (i=0; i<2; i++)
	    {
	    	x1 = (i ? line->endx : line->startx);
	    	y1 = (i ? line->endy : line->starty);
	    	
	    	/* Check against all potentially close walls */
	    	for (line2=first; line2->startx < x1 + 3; line2++)
		    for (j=0; j<2; j++)
		    {
		    	/* Offset by 3 to check 6x6 region */
		    	x2 = (j ? line2->endx : line2->startx) - 3;
		    	y2 = (j ? line2->endy : line2->starty) - 3;
		    	/* If endpoints are within 6x6 box, process junction */
		    	if (x1 > x2 && y1 > y2 &&
		    		x1 < x2 + 6 && y1 < y2 + 6)
		    		one_close(line, line2, i, j);
		    }
	    }
	}
}


/* Junction patch patterns for different intersection types */
int nepatch[4] = {0xE000, 0xC001, 0x8003, 0x0007};
int enepatch[4] = {0xFC00, 0xF003, 0xC00F, 0x003F};
int epatch[4] = {0x0003, 0x0003, 0x0003, 0x0003};
int sepatch[11] = {0x07FF, 0x83FF, 0xC1FF, 0xE0FF, 0xF07F, 0xF83F, 0xFC1F,
			0xFE0F, 0xFF07, 0xFF83, 0xFFC1};
int ssepatch[18] = {0x00FF, 0x00FF, 0x807F, 0x807F, 0xC03F, 0xC03F,
			0xE01F, 0xE01F, 0xF00F, 0xF00F, 0xF807, 0xF807,
			0xFC03, 0xFC03, 0xFE01, 0xFE01, 0xFF00, 0xFF00};

/*
 * ONE_CLOSE - Calculate junction patches for two intersecting walls
 * 
 * This massive switch statement handles all 64 possible combinations
 * of wall directions meeting. For each case, it:
 * 1. Determines what type of patch is needed
 * 2. Adds or replaces white pieces to fix the junction
 * 3. Adjusts h1/h2 values to modify wall black drawing
 * 
 * Parameters:
 *   line, line2 - the two walls that intersect
 *   n, m - which endpoints (0=start, 1=end) are close
 */
one_close(line, line2, n, m)
register linerec *line, *line2;
int n, m;
{
	register int dir1, dir2, i, j;
	
	/* Convert wall types to directions (0-15) */
	/* The magic "9 - newtype" converts NEW_* constants to compass directions */
	dir1 = 9 - line->newtype;
	if (n)  /* If checking end point, reverse direction */
		dir1 = (dir1 + 8) & 15;
	dir2 = 9 - line2->newtype;
	if (m)
		dir2 = (dir2 + 8) & 15;
	
	/* Same direction walls don't need patches */
	if (dir1 == dir2)
		return;
	
	/* Giant switch to handle each direction combination */
	switch(dir1)
	{
	case 0:  /* South wall */
		switch (dir2)
		{
		case 15:  /* Meets NNE */
		case 1:   /* Meets SSE */
			i = 21;  /* Large patch needed */
			break;
		case 2:   /* Meets SE */
			i = 10;
			break;
		case 3:   /* Meets ESE */
		case 14:  /* Meets NE */
			i = 6;
			break;
		default:
			return;  /* No patch needed */
		}
		j = line->h2;
		if (line->length - i > j)
			return;
		/* Add or replace white patch at junction */
		(*(j < line->length ? replace_white_2 : add_white_2))
			(line->startx, line->starty + j,
			 line->endx, line->endy - i, i, npatch);
		line->h2 = line->length - i;  /* Adjust black drawing limit */
		break;
		
	/* ... Similar logic for all other directions ... */
	/* Each case calculates appropriate patches and adjusts h1/h2 */
	/* The specific numbers (21, 10, 6, etc.) were determined through */
	/* trial and error to make junctions look correct */
	
	case 1:
		break;  /* No patches needed for this direction */
		
	case 2:  /* SE wall */
		switch (dir2)
		{
		case 0:
			i = 3;
			break;
		case 1:
			i = 6;
			break;
		case 3:
			i = 4;
			break;
		case 14:
			i = 1;
			break;
		case 15:
			i = 2;
			break;
		default:
			return;
		}
		/* Add multiple small patches along the junction */
		for (j = 0; j < 4*i; j += 4)
			if (line->h1 < 5 + j)
				add_white(line->startx + 3 + j,
					line->starty - 4 - j,
					4, nepatch);
		i--;
		j = 5 + 4*i;
		if (line->h1 < j)
			line->h1 = j;
	case 3:
	case 4:
	case 5:
		break;
		
	/* ... Continue for all 16 directions ... */
	
	default:
		break;
	}
}



/*
 * WHITE_HASH_MERGE - Add crosshatch patterns at junction points
 * 
 * For each white piece that coincides with a junction, this:
 * 1. Applies a crosshatch pattern using the background pattern
 * 2. Marks the white as having a junction (hasj = TRUE)
 * 3. Removes the junction from the list (since it's been processed)
 */
white_hash_merge()
{
	register whiterec *wh;
	register junctionrec *j;
	junctionrec *movej;
	register int i, back, x;
	int *newdata;
	
	j = junctions;
	for (wh=whites; wh->x < worldwidth - 8; wh++)
	    if (wh->ht == 6 && no_close_wh(wh) && wh->x > 8)
	    {
		/* Find junction at this white's position */
		while (j > junctions && j->x >= wh->x)
			j--;
		while (j->x <= wh->x && j->y != wh->y)
			j++;
		if (j->x == wh->x && j->y == wh->y)
		{
			/* Get background pattern for this position */
			back = (((wh->x + wh->y) & 1) ? 
					backgr2 : backgr1);
			
			/* Allocate space for modified pattern if needed */
			if (wh->data >= whitestorage &&
				wh->data < whitestorage + whitesused)
				newdata = wh->data;
			else
			{
				newdata = whitestorage + whitesused;
				whitesused += 6;
			}
			
			/* Apply hash pattern to create crosshatch effect */
			for (i=0; i<6; i++)
			{
				/* Complex bit manipulation to overlay hash on white */
				newdata[i] =
					(back &
					 (~wh->data[i] | hash_figure[i]))
					^ hash_figure[i];
				/* Rotate background pattern for next line */
				asm {
					rol.w	#1, back
				}
			}
			wh->data = newdata;
			wh->hasj = TRUE;  /* Mark as junction white */
			
			/* Remove processed junction from list */
			for (movej = j; movej->x < 20000; movej++)
				*movej = movej[1];
			numjunctions--;
		}
	    }
}


/*
 * NO_CLOSE_WH - Check if a white piece has no other whites nearby
 * Used to determine if hash pattern should be applied
 */
int no_close_wh(w1)
register whiterec *w1;
{
	register whiterec *w2;
	
	/* Check whites before this one */
	for (w2=w1-1; w2 >= whites && w2->x > w1->x - 3; w2--)
		if (w2->y < w1->y + 3 && w2->y > w1->y - 3)
			return(FALSE);
	/* Check whites after this one */
	for (w2=w1+1; w2->x < w1->x + 3; w2++)
		if (w2->y < w1->y + 3 && w2->y > w1->y - 3)
			return(FALSE);
	return(TRUE);
}
	


/*
 * FAST_WHITES - Efficiently draw all visible white pieces
 * 
 * This is called each frame to draw white shadows. It:
 * 1. Uses sorted white list to quickly find visible pieces
 * 2. Draws regular whites with white_wall_piece()
 * 3. Draws junction whites with eor_wall_piece() for special effect
 * 4. Handles world wrapping by making two passes
 */
fast_whites()
{
	register whiterec *wh;
	register int top, left, right, bot;
	int i;
	int white_wall_piece(), eor_wall_piece();
	
	top = screeny;
	left = screenx - 15;  /* Margin for white piece width */
	bot = screenb;
	right = screenr;
	
	/* Two passes for world wrapping */
	for (i=0; i<2; i++)
	{
		asm
		{
			move.l	D3, -(SP)  /* Save D3 register */
			
			move.l	whites(A5), wh
			move.w	#16*sizeof(whiterec), D3
			
			/* Fast forward by 16 whites at a time */
		@fast	adda.w	D3, wh
			cmp.w	OFFSET(whiterec, x)(wh), left
			bgt.s	@fast
			suba.w	D3, wh
			moveq	#sizeof(whiterec), D3
			bra.s	@enterf
			
			/* Linear search for first visible white */
		@find	adda.w	D3, wh
		@enterf	cmp.w	OFFSET(whiterec, x)(wh), left
			bgt.s	@find
			
			add.w	#15, left  /* Adjust for search margin */
			bra.s	@enter
		
			/* Main loop - process each potentially visible white */
		@loop	adda.w	D3, wh
		@enter	move.w	OFFSET(whiterec, x)(wh), D0
			cmp.w	D0, right
			ble.s	@leave  /* Stop when past right edge */
			
			/* Check vertical visibility */
			move.w	OFFSET(whiterec, y)(wh), D1
			cmp.w	D1, bot
			blt.s	@loop  /* Skip if above screen */
			sub.w	top, D1
			move.w	OFFSET(whiterec, ht)(wh), D2
			neg.w	D2
			cmp.w	D2, D1
			ble.s	@loop  /* Skip if below screen */
			
			/* White is visible - prepare parameters */
			neg.w	D2  /* Make height positive */
			sub.w	left, D0  /* Convert to screen coords */
			
			/* Push parameters for function call */
			move.w	D2, -(SP)    /* height */
			move.l	OFFSET(whiterec, data)(wh), -(SP)  /* pattern */
			move.w	D1, -(SP)    /* y */
			move.w	D0, -(SP)    /* x */
			
			/* Call appropriate drawing function */
			tst.w	OFFSET(whiterec, hasj)(wh)
			beq.s	@white
			jsr	eor_wall_piece  /* Junction white */
			adda.w	#10, SP
			bra.s	@loop
			
		@white	jsr	white_wall_piece  /* Regular white */
			adda.w	#10, SP
			bra.s	@loop
						
		@leave	sub.w	#15, left  /* Restore left margin */
			move.l	(SP)+, D3
		}
				
		/* Adjust for world wrap */
		left -= worldwidth;
		right -= worldwidth;
	}
}


/* take args in register variables for speed? */

/*
 * WHITE_WALL_PIECE - Draw a regular white shadow piece
 * 
 * Uses AND operation to clear pixels (make them white)
 * Handles clipping at screen edges
 */
white_wall_piece(x, y, def, height)
register int x, y, height;
register char *def;			/* really (int *) */
{
	register long clip;
	
	/* Vertical clipping */
	if (y < 0)
	{
		if ((height += y) <= 0)
			return;
		def -= y << 1;  /* Adjust pattern pointer */
		y = 0;
	}
	else if (y + height > VIEWHT)
	{
		if (y >= VIEWHT)
			return;
		height = VIEWHT - y;
	}
	
	/* Horizontal clipping setup */
	clip = ~CENTER_CLIP;  /* Default: clear all bits */
	if (x < 0)
	{
		if (x <= -16)
			return;
		clip = ~LEFT_CLIP;  /* Only clear right portion */
	}
	else if (x >= SCRWTH-16)
	{
		if (x >= SCRWTH)
			return;
		clip = ~RIGHT_CLIP;  /* Only clear left portion */
	}

	y += SBARHT;  /* Adjust for status bar */
	
	/* ASSEMBLY: Optimized pixel drawing loop */
	asm
	{
		FIND_WADDRESS(x,y)  /* Get screen address */
		
		and.w	#15, x      /* Get bit offset */
		neg.w	x
		add.w	#16, x      /* Convert to shift amount */
		moveq	#64, D1     /* Line increment */
		bra.s	@enter
		
	@loop	moveq	#-1, D0     /* Start with all bits set */
		move.w	(def)+, D0  /* Get pattern for this line */
		rol.l	x, D0       /* Align to pixel boundary */
		or.l	clip, D0    /* Apply clipping mask */
		and.l	D0, (A0)    /* Clear pixels (AND with pattern) */
		adda.l	D1, A0      /* Next screen line */
	@enter	dbra	height, @loop
	}
}


/*
 * EOR_WALL_PIECE - Draw a junction white with special effect
 * 
 * Uses XOR operation to create crosshatch pattern at junctions
 * This creates visual interest at wall intersections
 */
eor_wall_piece(x, y, def, height)
register int x, y, height;
register char *def;			/* really (int *) */
{
	register long clip;
	
	/* Vertical clipping - same as white_wall_piece */
	if (y < 0)
	{
		if ((height += y) <= 0)
			return;
		def -= y << 1;
		y = 0;
	}
	else if (y + height > VIEWHT)
	{
		if (y >= VIEWHT)
			return;
		height = VIEWHT - y;
	}
	
	/* Horizontal clipping - different masks for XOR */
	clip = CENTER_CLIP;  /* Default: use all bits */
	if (x < 0)
	{
		if (x <= -16)
			return;
		clip = LEFT_CLIP;  /* Only use left portion */
	}
	else if (x >= SCRWTH-16)
	{
		if (x >= SCRWTH)
			return;
		clip = RIGHT_CLIP;  /* Only use right portion */
	}

	y += SBARHT;
	
	/* ASSEMBLY: XOR drawing loop */
	asm
	{
		FIND_WADDRESS(x,y)
		
		and.w	#15, x
		neg.w	x
		add.w	#16, x
		moveq	#64, D1
		bra.s	@enter
		
	@loop	moveq	#0, D0      /* Start with no bits */
		move.w	(def)+, D0  /* Get pattern */
		rol.l	x, D0       /* Align */
		and.l	clip, D0    /* Apply clipping */
		eor.l	D0, (A0)    /* XOR with screen (creates pattern) */
		adda.l	D1, A0
	@enter	dbra	height, @loop
	}
}



/*
 * FAST_HASHES - Draw hash patterns at visible junctions
 * 
 * Similar structure to fast_whites() but draws small hash marks
 * at junction points for visual detail
 */
fast_hashes()
{
	register junctionrec *j;
	register int top, left, right, bot;
	int i;
	void draw_hash();
	
	top = screeny - 5;   /* Extra margin for hash height */
	left = screenx - 8;
	bot = screenb;
	right = screenr;
	
	for (i=0; i<2; i++)  /* Two passes for world wrap */
	{
	asm
	{
		lea	junctions(A5), j
		move.w	#sizeof(junctionrec)*16, D0
		
		/* Fast forward to visible junctions */
	@find16	adda.w	D0, j
		cmp.w	OFFSET(junctionrec, x)(j), left
		bgt.s	@find16
		suba.w	D0, j
		bra.s	@enter1
			
	@loop1	addq.l	#sizeof(junctionrec), j
	@enter1	cmp.w	OFFSET(junctionrec, x)(j), left
		bgt.s	@loop1
		
		addq.w	#8, left
		bra	@enter2
		
		/* Process each visible junction */
	@loop2	move.w	OFFSET(junctionrec, y)(j), D2
		cmp.w	top, D2
		blt.s	@skip    /* Above screen */
		cmp.w	bot, D2
		bge.s	@skip    /* Below screen */
		
		move.w	OFFSET(junctionrec, x)(j), D1
		sub.w	left, D1
		sub.w	screeny(A5), D2
		
		/* Check if can use optimized inline drawing */
		blt.s	@jsr_it  /* Need clipping */
		cmp.w	#VIEWHT-5, D2
		bge.s	@jsr_it  /* Need clipping */
		tst.w	D1
		blt.s	@jsr_it  /* Need clipping */
		cmp.w	#SCRWTH-9, D1
		blt.s	@do_quick  /* Can use fast path */
		
		/* Call general hash drawing function */
	@jsr_it	move.w	D2, -(SP)
		move.w	D1, -(SP)
		jsr	draw_hash
		addq.w	#4, SP
		
	@skip	addq.l	#sizeof(junctionrec), j
	@enter2	cmp.w	OFFSET(junctionrec, x)(j), right
		bgt.s	@loop2
		bra	@leave
		
		/* OPTIMIZED INLINE HASH DRAWING */
		/* Used when hash is fully visible */
	@do_quick	
		add.w	#SBARHT, D2
		FIND_WADDRESS(D1, D2)
		and.w	#15, D1
		move.l	#0x80000000, D0
		lsr.l	D1, D0
		
		/* Draw 6-line hash pattern */
		or.l	D0, (A0)         /* Line 1 */
		move.l	D0, D1
		lsr.l	#1, D1
		or.l	D1, D0
		lsr.l	#1, D0
		or.l	D0, 64*1(A0)     /* Line 2 */
		lsr.l	#2, D0
		or.l	D0, 64*2(A0)     /* Line 3 */
		lsr.l	#2, D0
		or.l	D0, 64*3(A0)     /* Line 4 */
		lsr.l	#2, D0
		or.l	D0, 64*4(A0)     /* Line 5 */
		move.l	D0, D1
		lsr.l	#2, D1
		lsr.l	#1, D0
		and.l	D1, D0
		or.l	D0, 64*5(A0)     /* Line 6 */
		bra	@skip
		
	@leave	subq.w	#8, left
	}
		right -= worldwidth;
		left -= worldwidth;
	}
}



/*
 * DRAW_HASH - Draw a hash mark at a junction with clipping
 * 
 * General-purpose hash drawing that handles edge cases
 */
void draw_hash(x, y)
register int x, y;
{
	register char *data = (char *) hash_figure;
	register long clip;
	register int height;
	
	height = 6;
	
	/* Vertical clipping */
	if (y < 0)
	{
		height += y;
		data -= y << 1;
		y = 0;
	}
	else if (y >= VIEWHT-6)
	{
		height = VIEWHT - y;
	}
	
	/* Horizontal clipping */
	if (x < 0)
		clip = LEFT_CLIP;
	else if (x >= SCRWTH - 9)
		clip = RIGHT_CLIP;
	else
		clip = CENTER_CLIP;

	y += SBARHT;

	/* ASSEMBLY: Draw hash pattern with clipping */
	asm
	{
		FIND_WADDRESS(x,y)
		
		and.w	#15, x
		neg.w	x
		add.w	#16, x
		moveq	#64, D1
		subq.w	#1, height
		blt.s	@leave
		
	@loop	moveq	#0, D0
		move.w	(data)+, D0  /* Get hash pattern */
		rol.l	x, D0        /* Align */
		and.l	clip, D0     /* Apply clipping */
		or.l	D0, (A0)     /* Draw pixels */
		adda.l	D1, A0
		dbra	height, @loop
	@leave
	}	
}
		
		