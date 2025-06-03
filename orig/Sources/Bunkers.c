/*
	File Bunkers.c: contains routines for dealing with bunkers.
	
	Copyright (c) 1986-88 Randall H. Wilson
*/ 

#include "GW.h"
#include "Macros.h"

extern bunkrec bunkers[NUMBUNKERS];
extern int worldwidth, worldheight, worldwrap, shootslow;
extern int xstart, ystart, planetbonus, gravx, gravy;

extern shotrec bunkshots[];
extern Bunker_Pic *bunker_images[2], *bunker_defs, *bunker_masks;
extern int shotvecs[];
extern int screenx, screeny, screenr, screenb;
extern char *front_screen, *back_screen;
extern int showing_primary;
extern int shipx, shipy, globalx, globaly;
extern int on_right_side;
extern int xbshotstart[][16], ybshotstart[][16],
			xbcenter[][16], ybcenter[][16];


do_bunkers()
{
	register bunkrec *bunk;
	
	if (rint(100) < shootslow)
		bunk_shoot();
	for (bunk=bunkers; bunk->rot >= 0; bunk++)
		if (bunk->kind >= BUNKROTKINDS && --(bunk->rotcount) <= 0)
			if (bunk->kind == FOLLOWBUNK)
			{
				bunk->rot += aim_bunk(bunk);
				bunk->rot &= (BUNKFRAMES-1);
				bunk->rotcount = 3*BUNKFCYCLES;
			}
			else
			{
				bunk->rot++;
				bunk->rot &= (BUNKFRAMES-1);
				bunk->rotcount = BUNKFCYCLES;
			}
	do_bunks(screenx, screeny);
	if (on_right_side)
		do_bunks(screenx-worldwidth, screeny);
}
	


int aim_bunk(bunk)
register bunkrec *bunk;
{
	int angle, diff, rot;
	
	angle = aim_dir(bunk);			/* 0-359 */
	angle += 11;
	if (angle >= 360)
		angle -= 360;
	angle = (angle << 1) / 45;		/* / 22.5 => 0-15 */
	if (angle >= 8)
		angle -= 8;					/* 0-7 */
	
	diff = angle - bunk->rot;
	if (diff < 0)
		diff += 8;
	
	if (diff == 0)
		return(0);
	else
		return(diff < 4 ? 1 : -1);
}


int aim_dir(bp)
bunkrec *bp;
{
	static Rect base = {-10, -10, 10, 10};
	Point del;
	int angle;
	
	del.v = globaly - bp->y;
	del.h = globalx - bp->x;
	if (worldwrap)
		if (del.h > worldwidth>>1)
			del.h -= worldwidth;
		else if (del.h < - worldwidth >> 1)
			del.h += worldwidth;
	
	PtToAngle(&base, del, &angle);
	return(angle);
}


follow_shot(bp, sp)
bunkrec *bp;
shotrec *sp;
{
	int straight, angle, dang;
	
	straight = aim_bunk(bp);
	if (straight == 0)				/* if aiming at ship */
		angle = aim_dir(bp);
	else
	{
		angle = (bp->rot * 45) >> 1;
		dang = aim_dir(bp) - angle;
		if ((dang > 90 && dang < 270) || dang < -90)
			angle += 180;
	}
	angle *= 64;
	angle /= 45;					/* *(512/360) => 0-511 */
	rand_shot(angle-2, angle+2, sp);
}	


bunk_shoot()
{
	register int sum, i, left, right;
	int bunkx, farleft, farright, top, bot;
	register shotrec *sp;
	register bunkrec *bp;
	char eligible[NUMBUNKERS], c;
	
	for (i=0, sp=bunkshots; i<NUMSHOTS && sp->lifecount; i++, sp++)
		;
	if (i == NUMSHOTS) return;				/* no space in shot array	*/

	left = screenx - SHOOTMARG;
	right = screenr + SHOOTMARG;
	if ((farleft = left) < 0)
		farleft += worldwidth;
	else
		farleft -= worldwidth;
	farright = farleft + (SCRWTH + 2*SHOOTMARG);
	top = screeny - SHOOTMARG;
	bot = screenb + SHOOTMARG;
	sum = 0;
	for (i=0, bp=bunkers; bp->rot >= 0; bp++, i++)
	{	if (bp->alive && bp->y > top && bp->y < bot &&
			( (bp->x > left && bp->x < right) ||
			  (bp->x > farleft && bp->x < farright) )	)
		{
			c = 1;
			if (bp->kind == GENERATORBUNK)
				c = 0;
			else if (bp->kind == DIFFBUNK)
				switch(bp->rot & 3)
				{	case 0:	c = 0; break;
					case 1:
					case 3:	c = 2; break;
				}
		}
		else
			c = 0;
		eligible[i] = c;
		sum += c;
	}

	if (sum == 0) return;					/* no bunker to shoot it	*/
	
	sum = rint(sum);
	for (i=0; ; i++) 						/* find n'th alive bunker	*/
		if ((sum -= eligible[i]) < 0)
			break;
	bp = bunkers + i;						/* bp points to the bunker	*/

	i = rint(2);
	if (bp->kind == FOLLOWBUNK)
		follow_shot(bp, sp);
	else
		rand_shot(bp->ranges[i].low, bp->ranges[i].high, sp);
	
	sp->x8 = (bp->x + xbshotstart[bp->kind][bp->rot]) << 3;
	sp->y8 = (bp->y + ybshotstart[bp->kind][bp->rot]) << 3;
	sp->lifecount = BUNKSHLEN;
	sp->btime = 0;
	set_life(sp, NULL);
	for (bunkx = bp->x; bunkx < worldwidth << 1; bunkx += worldwidth)
	{
		if (bunkx > screenx && bunkx < screenr && 
				bp->y > screeny && bp->y < screenb)
			start_sound(BUNK_SOUND);
		else if (bunkx > screenx-SOFTBORDER && bunkx < screenr+SOFTBORDER &&
				 bp->y > screeny-SOFTBORDER && bp->y < screenb+SOFTBORDER)
			start_sound(SOFT_SOUND);
	}
}


rand_shot(loangle, hiangle, sp)
int loangle, hiangle;
register shotrec *sp;
{
	int angle, intangle, yangle;
	
	angle = rint(hiangle-loangle+1) + loangle;
	angle &= 511;
	intangle = angle >> 4;
	angle &= 15;
	yangle = (intangle + 24) & 31;
	
	sp->h = shotvecs[intangle] + 
			((angle * (shotvecs[(intangle+1)&31] - shotvecs[intangle])) >> 4);
	sp->v = shotvecs[yangle] + 
			((angle * (shotvecs[(yangle+1) & 31] - shotvecs[yangle])) >> 4);
}



do_bunks(scrnx, scrny)
register int scrnx;
int scrny;
{
	register bunkrec *bp;
	register int left, right, bunky;
	int align, ycenter, xcenter, bunkx;
	
	left = scrnx - 48;
	right = scrnx + SCRWTH + 48;
	for (bp=bunkers; bp->rot >= 0; bp++)
		if (bp->alive && bp->x > left && bp->x < right)
		{
			ycenter = ybcenter[bp->kind][bp->rot];
			bunky = bp->y - scrny - ycenter;
			if (bunky > -48 && bunky < VIEWHT)
			{
				xcenter = xbcenter[bp->kind][bp->rot];
				bunkx = bp->x - scrnx - xcenter;
				if (bp->kind >= BUNKROTKINDS ||
					(bp->rot <= 1 || bp->rot >= 9))
				{
					align = (bp->x + bp->y + xcenter + ycenter) & 1;
					draw_bunker(bunkx, bunky,
							bunker_images[align][bp->kind][bp->rot]);
				}
				else
					full_bunker(bunkx, bunky,
							bunker_defs[bp->kind][bp->rot],
							bunker_masks[bp->kind][bp->rot]);
			}
		}
}



