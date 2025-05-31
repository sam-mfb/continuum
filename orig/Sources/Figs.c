/*
	GravFigs.c:  Figure defs and routines for Gravity Well
	
	Copyright (c) 1986-8 Randall H. Wilson 
*/

#include "GW.h"

extern long backgr1, backgr2;

		/*	ship figure		*/
Ship_Pic	*ship_masks, *ship_defs;


Shard_Pic *shard_images, **shard_defs, **shard_masks;


Bunker_Pic *bunker_defs;
Bunker_Pic *bunker_masks;
Bunker_Pic *bunker_images[2];			/* holds bunker eors */


Fuel_Pic *fuel_defs;
Fuel_Pic *fuel_masks;
Fuel_Pic *fuel_images[2];			/* holds fuel eors */


Crater_Pic crater_def, crater_mask, crater_images[2];


char flames[32][7] =
{
	{0x5A, 0xAC, 0x5A, 0x54, 0x38, 0x08, 0x10},
	{0x80, 0x6C, 0xB4, 0xC8, 0x50, 0x50, 0x20},
	{0x40, 0xA8, 0x7A, 0x94, 0x68, 0x50, 0x40},
	{0x80, 0x70, 0xA8, 0x54, 0x98, 0x60, 0x80},
	{0x30, 0x14, 0x4C, 0x36, 0x4A, 0x58, 0x80},
	{0x00, 0x10, 0x28, 0x34, 0x4C, 0x54, 0xAA},
	{0x08, 0x10, 0x2C, 0x58, 0x2C, 0xEA, 0x14},
	{0x00, 0x0C, 0x14, 0x68, 0x9C, 0x64, 0x1A},
	
	{0x0A, 0x14, 0x6E, 0xBA, 0x24, 0x1A, 0x04},
	{0x1A, 0x64, 0x9C, 0x68, 0x14, 0x0C, 0x00},
	{0x14, 0xEA, 0x2C, 0x58, 0x2C, 0x10, 0x08},
	{0xAA, 0x54, 0x4C, 0x34, 0x28, 0x10, 0x00},
	{0x80, 0x58, 0x4A, 0x36, 0x4C, 0x14, 0x30},
	{0x80, 0x60, 0x98, 0x54, 0xA8, 0x70, 0x80},
	{0x40, 0x50, 0x68, 0x94, 0x7A, 0xA8, 0x40},
	{0x20, 0x50, 0x50, 0xC8, 0xB4, 0x6C, 0x80},
	
	{0x10, 0x08, 0x38, 0x54, 0x5A, 0xAC, 0x5A},
	{0x08, 0x14, 0x14, 0x2A, 0x5A, 0x6C, 0x02},
	{0x04, 0x14, 0x2C, 0x52, 0xBC, 0x2A, 0x04},
	{0x02, 0x0C, 0x32, 0x54, 0x2A, 0x1C, 0x02},
	{0x02, 0x34, 0xA4, 0xD8, 0x64, 0x50, 0x18},
	{0xAA, 0x54, 0x64, 0x58, 0x28, 0x10, 0x00},
	{0x50, 0xAE, 0x68, 0x34, 0x68, 0x10, 0x20},
	{0xB0, 0x4C, 0x72, 0x2C, 0x50, 0x60, 0x00},
	
	{0x40, 0xB0, 0x48, 0xBA, 0xEC, 0x50, 0xA0},
	{0x00, 0x60, 0x50, 0x2C, 0x72, 0x4C, 0xB0},
	{0x20, 0x10, 0x68, 0x34, 0x68, 0xAE, 0x50},
	{0x00, 0x10, 0x28, 0x58, 0x64, 0x54, 0xAA},
	{0x18, 0x50, 0x64, 0xD8, 0xA4, 0x34, 0x02},
	{0x02, 0x1C, 0x2A, 0x54, 0x32, 0x0C, 0x02},
	{0x04, 0x2A, 0xBC, 0x52, 0x2C, 0x14, 0x04},
	{0x02, 0x6C, 0x5A, 0x2A, 0x14, 0x14, 0x08}
};


int shield_def[SHIPHT*2];
/* =
{	0x01FC, 0x0000, 0x0603, 0x0000,
	0x0800, 0x8000, 0x1000, 0x4000,
	0x2000, 0x2000, 0x4000, 0x1000,
	0x4000, 0x1000, 0x8000, 0x0800,
	0x8000, 0x0800, 0x8000, 0x0800,
	0x8000, 0x0800, 0x8000, 0x0800,
	0x8000, 0x0800, 0x8000, 0x0800,
	0x4000, 0x1000, 0x4000, 0x1000,
	0x2000, 0x2000, 0x1000, 0x4000,
	0x0800, 0x8000, 0x0603, 0x0000,
	0x01FC, 0x0000			};
*/


int xbshotstart[BUNKKINDS][16] = 
{	{2, 13, 18, 22, 24, 21, 16, 10, -2, -13, -18, -22, -24, -21, -16, -10},
	{0, 3, 15, 31, 24, 31, 17, 3, 0, -3, -15, -31, -24, -31, -17, -3},
	{0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0},
	{-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4,-4},
	{0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0}
	
};
int ybshotstart[BUNKKINDS][16] =
{	{-24, -21, -16, -10, 2, 13, 18, 22, 24, 21, 16, 10, -2, -13, -18, -22},
	{-24, -31, -17, -3, 0, 3, 15, 31, 24, 31, 17, 3, 0, -3, -15, -31},
	{0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0},
	{-3,-3,-3,-3,-3,-3,-3,-3,-3,-3,-3,-3,-3,-3,-3,-3},
	{0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0}
};

int xbcenter[BUNKKINDS][16] =
{	{24, 24, 24, 23, 22, 22, 22, 24, 24, 24, 24, 25, 26, 26, 26, 24},
	{25, 22, 21, 14, 10, 13, 18, 22, 23, 26, 27, 34, 38, 35, 30, 26},
	{24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24},
	{24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24},
	{24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24}
	
};
int ybcenter[BUNKKINDS][16] =
{	{26, 26, 26, 24, 24, 24, 24, 23, 22, 22, 22, 24, 24, 24, 24, 25},
	{38, 35, 30, 26, 25, 22, 21, 14, 10, 13, 18, 22, 23, 26, 27, 34},
	{24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24},
	{24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24},
	{24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24}
};



char strafe_defs[16][STRAFEHT]=
{
	{0x24, 0x95, 0x5A, 0x3C, 0x3C, 0x00, 0x00, 0x00},
	{0x48, 0x2B, 0x3C, 0x3F, 0x0C, 0x00, 0x00, 0x00},
	{0x24, 0x15, 0x1A, 0x1E, 0x0D, 0x00, 0x00, 0x00},
	{0x0A, 0x0A, 0x1C, 0x1F, 0x0C, 0x0E, 0x01, 0x00},
	
	{0x02, 0x04, 0x19, 0x1E, 0x1C, 0x1B, 0x04, 0x02},
	{0x00, 0x01, 0x0E, 0x0C, 0x1F, 0x1C, 0x0A, 0x0A},
	{0x00, 0x00, 0x00, 0x0D, 0x1E, 0x1A, 0x15, 0x24},
	{0x00, 0x00, 0x00, 0x0C, 0x3F, 0x3C, 0x2B, 0x48},
	
	{0x00, 0x00, 0x00, 0x3C, 0x3C, 0x5A, 0x95, 0x24},
	{0x00, 0x00, 0x00, 0x30, 0xFD, 0x3C, 0xD4, 0x12},
	{0x00, 0x00, 0x00, 0xB0, 0x78, 0x78, 0xA4, 0x24},
	{0x00, 0x80, 0x70, 0x30, 0xF8, 0x38, 0x50, 0x50},
	
	{0x40, 0x20, 0x98, 0x78, 0x38, 0xD8, 0x20, 0x40},
	{0x50, 0x50, 0x38, 0xF8, 0x30, 0x70, 0x80, 0x00},
	{0x24, 0xA4, 0x78, 0x78, 0xB0, 0x00, 0x00, 0x00},
	{0x12, 0xD4, 0x3C, 0xFD, 0x30, 0x00, 0x00, 0x00}  };
		



char digits[SPACECHAR+1][DIGHEIGHT] =
{
	{0xC3, 0x99, 0x99, 0x99, 0x99, 0x99, 0x99, 0x99, 0xC3},	/* 0 */
	{0xE7, 0xC7, 0xE7, 0xE7, 0xE7, 0xE7, 0xE7, 0xE7, 0xE7},	/* 1 */
	{0xC3, 0xB9, 0xF9, 0xF9, 0xF3, 0xE7, 0xCF, 0x9F, 0x81},	/* 2 */
	{0x81, 0xF3, 0xE7, 0xC3, 0xF9, 0xF9, 0xF9, 0xB9, 0xC3},	/* 3 */
	{0xF9, 0xF1, 0xE9, 0xD9, 0xB9, 0x80, 0xF9, 0xF9, 0xF9},	/* 4 */
	{0x81, 0x9F, 0x9F, 0x83, 0xF9, 0xF9, 0xF9, 0xB9, 0xC3},	/* 5 */
	{0xE3, 0xCF, 0x9F, 0x83, 0x99, 0x99, 0x99, 0x99, 0xC3},	/* 6 */
	{0x81, 0xF9, 0xF9, 0xF9, 0xF3, 0xE7, 0xE7, 0xE7, 0xE7},	/* 7 */
	{0xC3, 0x99, 0x99, 0x99, 0xC3, 0x99, 0x99, 0x99, 0xC3},	/* 8 */
	{0xC3, 0x99, 0x99, 0x99, 0x99, 0xC1, 0xF9, 0xF3, 0xC7},	/* 9 */
	
	{0xC3, 0x99, 0x99, 0x99, 0x81, 0x99, 0x99, 0x99, 0x99},
	{0x83, 0x99, 0x99, 0x99, 0x83, 0x99, 0x99, 0x99, 0x83},
	{0xC3, 0x9D, 0x9F, 0x9F, 0x9F, 0x9F, 0x9F, 0x9D, 0xC3},
	{0x83, 0x99, 0x99, 0x99, 0x99, 0x99, 0x99, 0x99, 0x83},
	{0x81, 0x9F, 0x9F, 0x9F, 0x87, 0x9F, 0x9F, 0x9F, 0x81},
	{0x81, 0x9F, 0x9F, 0x9F, 0x87, 0x9F, 0x9F, 0x9F, 0x9F},	/* F */
	{0xC3, 0x9D, 0x9F, 0x9F, 0x91, 0x99, 0x99, 0x99, 0xC3},
	{0x99, 0x99, 0x99, 0x99, 0x81, 0x99, 0x99, 0x99, 0x99},
	{0xE7, 0xE7, 0xE7, 0xE7, 0xE7, 0xE7, 0xE7, 0xE7, 0xE7},
	{0xF9, 0xF9, 0xF9, 0xF9, 0xF9, 0x99, 0x99, 0x99, 0xC3},
	{0x9C, 0x99, 0x93, 0x87, 0x8F, 0x87, 0x93, 0x99, 0x9C},
	{0xCF, 0xCF, 0xCF, 0xCF, 0xCF, 0xCF, 0xCF, 0xCF, 0xC1},
	{0xBE, 0x9C, 0x88, 0x80, 0x80, 0x94, 0x9C, 0x9C, 0x9C},	/* M */
	{0xBC, 0x9C, 0x8C, 0x84, 0x80, 0x90, 0x98, 0x9C, 0x9E},
	{0xC3, 0x99, 0x99, 0x99, 0x99, 0x99, 0x99, 0x99, 0xC3},
	{0x83, 0x99, 0x99, 0x99, 0x83, 0x9F, 0x9F, 0x9F, 0x9F},
	{0xC3, 0x99, 0x99, 0x99, 0x99, 0x99, 0x89, 0x93, 0xC5},
	{0x83, 0x99, 0x99, 0x99, 0x83, 0x99, 0x99, 0x99, 0x99},	/* R */
	{0xC7, 0x9B, 0x9F, 0x8F, 0xC7, 0xE3, 0xF3, 0xB3, 0xC7},
	{0x81, 0xE7, 0xE7, 0xE7, 0xE7, 0xE7, 0xE7, 0xE7, 0xE7},
	{0x99, 0x99, 0x99, 0x99, 0x99, 0x99, 0x99, 0x99, 0xC3},
	{0x99, 0x99, 0x99, 0x99, 0x99, 0xC3, 0xC3, 0xE7, 0xE7},	/* V */
	{0x9C, 0x9C, 0x9C, 0x9C, 0x94, 0x80, 0x88, 0x9C, 0xB3},
	{0x99, 0x99, 0x99, 0x99, 0xC3, 0x99, 0x99, 0x99, 0x99},
	{0x99, 0x99, 0x99, 0x99, 0xC3, 0xE7, 0xE7, 0xE7, 0xE7},
	{0x81, 0xF9, 0xF9, 0xF3, 0xE7, 0xCF, 0x9F, 0x9F, 0x81},	/* Z */
	
	{0xF7, 0xF7, 0xE3, 0xE3, 0xE3, 0xC1, 0xC1, 0x80, 0xBE},	/* ship */
	{0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF}	/* space */
};




/*
	Function Rotate Figures:  fills in the rest of the definitions,
		starting with the first 5 (3 for most things) positions.
		Now gets bunkers and other figures from a macpaint file.
*/
rotate_figures()
{
	extern char *whitestorage, *whites;		/* you ugly spasm */
	
			/* allocate space for the bitmaps */
	whitestorage = (char *) NewPtr((NUMLINES*2+20)*12L);
	whites = (char *) NewPtr((NUMLINES*6+20L)*12 /* sizeof(whiterec) */);
	
	ship_defs  = (Ship_Pic *) NewPtr((long) 32*sizeof(Ship_Pic));
	ship_masks = (Ship_Pic *) NewPtr((long) 32*sizeof(Ship_Pic));
	
	bunker_defs =
		(Bunker_Pic *) NewPtr((long) BUNKKINDS*sizeof(Bunker_Pic));
	bunker_masks=
		(Bunker_Pic *) NewPtr((long) BUNKKINDS*sizeof(Bunker_Pic));
	bunker_images[0]=
		(Bunker_Pic *) NewPtr((long) BUNKKINDS*sizeof(Bunker_Pic));
	bunker_images[1]=
		(Bunker_Pic *) NewPtr((long) BUNKKINDS*sizeof(Bunker_Pic));
		
	fuel_defs =
		(Fuel_Pic *)  NewPtr((long) (FUELFRAMES+1) * sizeof(Fuel_Pic));
	fuel_masks =
		(Fuel_Pic *)  NewPtr((long) (FUELFRAMES+1) * sizeof(Fuel_Pic));
	fuel_images[0] =
		(Fuel_Pic *)  NewPtr((long) (FUELFRAMES+1) * sizeof(Fuel_Pic));
	fuel_images[1] =
		(Fuel_Pic *)  NewPtr((long) (FUELFRAMES+1) * sizeof(Fuel_Pic));
	
	shard_images =
		(Shard_Pic *) NewPtr((long) SHARDKINDS * sizeof(Shard_Pic));
	shard_defs =		/* temporary, until transfered to images */
		(Shard_Pic **)NewHandle((long) SHARDKINDS * sizeof(Shard_Pic));
	shard_masks =		/* temporary */
		(Shard_Pic **)NewHandle((long) SHARDKINDS * sizeof(Shard_Pic));
	
	if (shard_masks == NULL)
		memory_error();
	
	load_figs();
	
	rotate_ship(ship_defs);
	rotate_ship(ship_masks);
	
	load_sbar();
}



rotate_ship(ships)
register Ship_Pic *ships;
{
	register int x, y, k, *p;
#define	SIZE	(2*SCENTER)
						/* clear out the remaining ships	*/
	for (x=5; x<32; x++)
		for(y=0, p=ships[x]; y < SHIPHT*2; y++, p++)
			*p = 0;
	
						/* make positions 5-8			*/
	for (k=0; k < 4; k++)
		for (x=0; x<SIZE+1; x++)
			for(y=0; y<SIZE+1; y++)
				if (get_bit(SIZE-y, SIZE-x, ships[k], 4))
					put_bit(x, y, TRUE, ships[8-k], 4);
	
						/* make positions 24-31			*/
	for (k=1; k < 9; k++)
		for (x=0; x<SIZE+1; x++)
			for(y=0; y<SIZE+1; y++)
				if (get_bit(SIZE-x, y, ships[k], 4))
					put_bit(x, y, TRUE, ships[32-k], 4);

						/* make positions 9-23			*/	
	for (k=1; k < 9; k++)
		for (y = 0; y < SIZE; y++)
			for (x=0; x < 2; x++)
			{	ships[8+k][y*2+x] = 
					ships[8-k][SIZE*2 - y*2 + x];
				if(k != 8)
				   ships[24-k][y*2+x] =
					ships[24+k][SIZE*2 - y*2 + x];
			}
}



/*	function put_bit:  sets bit x in the y'th row of int array p to
		value.  the array has row_bytes bytes in one row.
*/
put_bit(x, y, value, p, row_bytes)
register int x, y, *p;
int value, row_bytes;
{
	asm{	
		tst.w		value(A6)
		beq		@leave
		muls		row_bytes(A6), y
		adda.w	y, p
		move.w	x, D0
		asr.w		#3, D0
		adda.w	D0, p
		and.w		#7, x
		move.b	#1<<7, D0
		lsr.b		x, D0
		or.b		D0, (p)
	@leave
	}
}


/*	function get_bit:  returns the value of bit x in the y'th long of
		long array p.
*/
get_bit(x, y, p, row_bytes)
register int x, y, *p;
int row_bytes;
{
	int retval;
	asm{	
		clr.w		retval(A6)
		muls		row_bytes(A6), y
		adda.w	y, p
		move.w	x, D0
		asr.w		#3, D0
		adda.w	D0, p
		and.w		#7, x
		move.b	#1<<7, D0
		lsr.b		x, D0
		and.b		(p), D0
		beq		@returnit
		move.w	#1, retval(A6)
	@returnit
	}
	return(retval);
}


char CR_notice[] = {'C'-45, 'o'-45, 'p'-45, 'y'-45, 'r'-45, 'i'-45,
				'g'-45, 'h'-45, 't'-45, ' '-45, '('-45, 'C'-45,
				')'-45, ' '-45, '1'-45, '9'-45, '8'-45, '8'-45,
				' '-45, 'R'-45, 'a'-45, 'n'-45, 'd'-45, 'a'-45,
				'l'-45, 'l'-45, ' '-45, 'H'-45, '.'-45, ' '-45,
				'W'-45, 'i'-45, 'l'-45, 's'-45, 'o'-45, 'n'-45};


#define	FIGURESIZE	30000
extern char figurefile[];

load_figs()
{
	BitMap figbmap;
	Handle figsh;
/*	int f;
	long length;
	
	if (!(figsh = NewHandle((long) FIGURESIZE)))
		memory_error();
		
	if (FSOpen(figurefile, 0, &f))
		ExitToShell();
	
	SetFPos(f, fsFromStart, 512L);
	length = macread(f, FIGURESIZE, *figsh);
	FSClose(f);

	SetHandleSize(figsh, length);
	AddResource(figsh, 'MISC', M_FIGS, NULL);
*/	
	figsh = GetResource('MISC', M_FIGS);
	expandtitlepage(figsh, &figbmap, SCRHT*2);
	ReleaseResource(figsh);
	
	extract_bunks(&figbmap);
	extract_fuels(&figbmap);
	extract_ships(&figbmap);
	extract_shards(&figbmap);
	extract_crater(&figbmap);
	
	DisposPtr(figbmap.baseAddr);
}


extract_bunks(figbmap)
BitMap *figbmap;
{
	register int i, j, k, h, *to;
	int kind, k6, back1, back2;
	BitMap bunkbmap;
	Rect fromrect, torect;
	
	SETRECT(bunkbmap.bounds, 0, 0, 48, BUNKHT);
	SETRECT(torect, 1, 1, 48-1, BUNKHT-1);
	bunkbmap.rowBytes = 6;
	for (j=0; j<BUNKKINDS+3; j++)
		for (i=0; i<8; i++)
		{
			SETRECT(fromrect, i*BUNKHT + 1, j*BUNKHT + 1,
				i*BUNKHT + (BUNKHT-1), j*BUNKHT + (BUNKHT-1));
			if (j < BUNKROTKINDS)
			{
				bunkbmap.baseAddr = (char *) (to =
				(i<4 ? bunker_defs[j][i] : bunker_masks[j][i-4]));
			}
			else
				bunkbmap.baseAddr = (char *) (to =
					((j & 1) ? bunker_masks : bunker_defs)
					[j/2 + 1][i]);
			
			for (k = 0; k < 3*BUNKHT; k++)
				*to++ = 0;				/* clear it first */
			CopyBits(figbmap, &bunkbmap, &fromrect, 
					&torect, srcCopy, NULL);
		}
	rotate_bunker(bunker_defs);
	rotate_bunker(bunker_masks);
	
	back1 = (int) backgr1;
	back2 = (int) backgr2;
	for (j=0; j<2; j++)
	{
	   for (kind=0; kind<BUNKKINDS; kind++)
		for (i=0; i < 16; i++)
		{
			to = bunker_images[j][kind][i];
			for (k=0; k < BUNKHT/2; k++)
			{
				k6 = k*6;
				for (h=0; h<3; h++)
				{
					to[k6+h] =
						(back1 & bunker_masks[kind][i][k6+h])
							^ bunker_defs[kind][i][k6+h];
					to[k6+h+3] =
						(back2 & bunker_masks[kind][i][k6+h+3])
							^ bunker_defs[kind][i][k6+h+3];
				}
			}
		}
	   back1 = (int) backgr2;
	   back2 = (int) backgr1;
	}
}


rotate_bunker(defs)
register Bunker_Pic *defs;
{
	register int x, y, i;
	int k;
	register int *old, *new;
	
						/* clear out the remaining defs	*/
	for (i=0; i < BUNKROTKINDS; i++)
		for (x=4; x < 16; x++)
			for(y=0, new=defs[i][x]; y < BUNKHT*3; y++, new++)
				*new = 0;
	
	for (k=0; k<BUNKROTKINDS; k++)
	  for (i=4; i<16; i++)		/* make positions 4-15 */
	  {
		old = defs[k][i-4];
		new = defs[k][i];
		asm {
				lea		5(new), A0
				
		@global	moveq		#0, D2		; mask (bit number) for one column
		
		@outer	moveq		#5, D3		; number of bytes across
				
		@middle	moveq		#7, D1		; mask (bit number) for one byte
				
		@inner	btst		D1, (old)		; test D1'th bit in byte
				beq.s		@leaveit		; if clear, leave corresponding bit
				bset		D2, (A0)		; if set, set
		@leaveit	addq.w	#6, A0		; next row in vertical column
				dbra		D1, @inner		; if not, do next bit
				
				addq.w	#1, old		; if so, next byte
				dbra		D3, @middle		; do another byte for one row
				
				suba.w	#BUNKHT*6, A0	; end of column, go back up for next
				addq.w	#1, D2		; next column
				cmp.w		#8, D2		; off left end of vert byte?
				blt		@outer		; if not, go for next column and row
				
				subq.w	#1, A0		; go to next vert byte of columns left
				cmpa.l	new, A0		; are we too far left??
				bge		@global		; if not, go for next column
		}
	  }
}



#define	FUEL_TOP	(8*48)

extract_fuels(figbmap)
BitMap *figbmap;
{
	register int i, j, k, *to, h;
	int back1, back2;
	BitMap fuelbmap;
	Rect fromrect, torect;
	Fuel_Pic *themaps;
	
	SETRECT(fuelbmap.bounds, 0, 0, 32, FUELHT);
	SETRECT(torect, 0, 0, 32, FUELHT);
	fuelbmap.rowBytes = 4;
	for (j=0; j<2; j++)
	{
		themaps = (j ? fuel_masks : fuel_defs);
		for (i=0; i<FUELFRAMES+1; i++)
		{
			SETRECT(fromrect, i*48, j*48 + (FUEL_TOP),
				i*48 + (FUELHT), j*48 + (FUEL_TOP + FUELHT));
			fuelbmap.baseAddr = (char *) (to = themaps[i]);
			CopyBits(figbmap, &fuelbmap, &fromrect, 
					&torect, srcCopy, NULL);
		}
	}
	back1 = (int) backgr1;
	back2 = (int) backgr2;
	for (j=0; j<2; j++)
	{
		for (i=0; i < FUELFRAMES+1; i++)
			for (k=0; k < FUELHT/2; k++)
			{
				for (h=0; h<2; h++)
					fuel_images[j][i][k*4+h] =
						(back1 & fuel_masks[i][k*4+h])
							^ fuel_defs[i][k*4+h];
				for (h=0; h<2; h++)
					fuel_images[j][i][k*4+h+2] =
						(back2 & fuel_masks[i][k*4+h+2])
							^ fuel_defs[i][k*4+h+2];
			}
		back1 = (int) backgr2;
		back2 = (int) backgr1;
	}
}

#define	SHIP_TOP	(FUEL_TOP+2*48)

extract_ships(figbmap)	/* and shield */
BitMap *figbmap;
{
	register int i, k, *to;
	BitMap shipbmap;
	Rect fromrect, torect;
	
	SETRECT(shipbmap.bounds, 0, 0, 32, SHIPHT);
	SETRECT(torect, 1, 1, 32-1, SHIPHT-1);
	shipbmap.rowBytes = 4;
	for (i=0; i<11; i++)
	{
		SETRECT(fromrect, i*32 + 1, SHIP_TOP+1,
			i*32 + (32-1), SHIP_TOP + (SHIPHT-1));
		switch (i / 5) {
			case 0:  to = ship_masks[i];	break;
			case 1:  to = ship_defs[i-5];	break;
			case 2:  to = shield_def; break;
		}
		shipbmap.baseAddr = (char *) to;
		for (k = 0; k < 2*SHIPHT; k++)
			*to++ = 0;				/* clear it first */
		CopyBits(figbmap, &shipbmap, &fromrect, 
				&torect, srcCopy, NULL);
	}
}


#define	SHARD_TOP	(SHIP_TOP + 32)

extract_shards(figbmap)
BitMap *figbmap;
{
	register int i, j, x, y, *to;
	int align, back[2], defmask;
	BitMap shardbmap;
	Rect fromrect, torect;
	register int *from;
	
	SETRECT(shardbmap.bounds, 0, 0, 16, SHARDHT);
	SETRECT(torect, 0, 0, 16, SHARDHT-1);
	shardbmap.rowBytes = 2;
	for (j=0; j<SHARDKINDS; j++)
		for (i=0; i<8; i++)
		{
			SETRECT(fromrect, i*16, SHARD_TOP + j*SHARDHT,
				i*16 + 16, SHARD_TOP + j*SHARDHT + SHARDHT-1);
			shardbmap.baseAddr = (char *) (to = (i<4 ? 
				(*shard_defs)[j][0][i] :
				(*shard_masks)[j][0][i-4]));
			to[15] = 0;
			CopyBits(figbmap, &shardbmap, &fromrect, 
					&torect, srcCopy, NULL);
		}
	
	for (j=0; j<SHARDKINDS; j++)
		for (i=4; i<16; i++)
		   for (defmask=0; defmask<2; defmask++)
		{
			to = (defmask ? (*shard_defs) : (*shard_masks))[j][0][i];
			from=(defmask ? (*shard_defs) : (*shard_masks))[j][0][i-4];
			for (y = 0; y < SHARDHT; y++)
			{
				to[y] = 0;
				for (x=0; x < SHARDHT; x++)
					to[y] |=
						(unsigned) ((from[(SHARDHT-1)-x] << y)
							& 0x8000) >> x;
			}
		}
	back[0] = (int) backgr1;
	back[1] = (int) backgr2;
	for (align=0; align<2; align++)
	{
		for (j=0; j<SHARDKINDS; j++)
			for (i=0; i<16; i++)
				for (y=0; y<SHARDHT; y++)
					shard_images[j][align][i][y] =
						(back[(y + align) & 1] & 
						 (*shard_masks)[j][0][i][y]) ^
						(*shard_defs)[j][0][i][y];
	}
	DisposHandle(shard_defs);
	DisposHandle(shard_masks);
}


#define	CRATER_TOP	SHARD_TOP
#define	CRATER_LEFT	(4*48)

extract_crater(figbmap)
BitMap *figbmap;
{
	register int i, j, *to;
	int align, back[2], defmask;
	BitMap cratbmap;
	Rect fromrect, torect;
	
	SETRECT(cratbmap.bounds, 0, 0, 32, CRATERHT);
	SETRECT(torect, 1, 1, 32-1, CRATERHT-1);
	cratbmap.rowBytes = 4;
	for (i=0; i<2; i++)
	{
		SETRECT(fromrect, CRATER_LEFT+1 + i*32, SHARD_TOP + 1,
			CRATER_LEFT-1+32 + i*32, CRATER_TOP + CRATERHT-1);
		cratbmap.baseAddr = (char *)
			(to = (i ? crater_mask : crater_def));
		for (j=0; j<CRATERHT*2; j++)
			to[j] = 0;
		CopyBits(figbmap, &cratbmap, &fromrect, 
				&torect, srcCopy, NULL);
	}
	
	back[0] = (int) backgr1;
	back[1] = (int) backgr2;
	for (align=0; align<2; align++)
		for (i=0; i<CRATERHT*2; i++)
			crater_images[align][i] =
				(back[((i>>1) + align) & 1] & 
				 crater_mask[i]) ^ crater_def[i];
}


#define	SBARFILESIZE	10000

load_sbar()
{
	register char *p;
	BitMap sbarbmap;
	extern char *sbarptr;
	Handle sbarh;
/*	extern char sbarfile[];
	int f;
	long length;

	if (!(sbarh = NewHandle((long) SBARFILESIZE)))
		memory_error();
		
	if (FSOpen(sbarfile, 0, &f))
		ExitToShell();
	
	SetFPos(f, fsFromStart, 512L);
	length = macread(f, SBARFILESIZE, *sbarh);
	FSClose(f);
	
	SetHandleSize(sbarh, length);
	AddResource(sbarh, 'MISC', M_SBAR, NULL);
*/	
	sbarh = GetResource('MISC', M_SBAR);
	expandtitlepage(sbarh, &sbarbmap, SBARHT);
	ReleaseResource(sbarh);
	
	sbarptr = sbarbmap.baseAddr;
	
			/* reverse the characters (to black on white) */
	for (p=digits[0]; p < digits[0] + sizeof(digits); p++)
		*p ^= 0xFF;
}



