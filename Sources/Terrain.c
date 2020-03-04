/*
	File Terrain.c: contains routines for dealing with terrain,
		fuel cells, explosions, etc. 
	
	Copyright (c) 1986-88 Randall H. Wilson
*/

#include "GW.h"
#include "Macros.h"


linerec lines[NUMLINES];
bunkrec bunkers[NUMBUNKERS];
fuelrec fuels[NUMFUELS];
craterrec craters[NUMCRATERS];
int numcraters;

int worldwidth, worldheight, worldwrap, shootslow;
int xstart, ystart, planetbonus, gravx, gravy;


extern shotrec bunkshots[];
extern Fuel_Pic *fuel_images[2];
extern Shard_Pic *shard_images;
extern Bunker_Pic *bunker_images[2], *bunker_defs, *bunker_masks;
extern Crater_Pic crater_images[2];
extern int map_bunk_defs[][8];
extern int xlength[], ylength[], slopes2[], slopeslshift2[];
extern int shotvecs[];
extern int screenx, screeny, screenr, screenb;
extern char *front_screen, *back_screen;
extern int showing_primary;
extern int shipx, shipy, globalx, globaly;
extern int on_right_side, machinetype;
extern int xbshotstart[][16], ybshotstart[][16],
			xbcenter[][16], ybcenter[][16];

shardrec shards[NUMSHARDS];
shotrec sparks[NUMSPARKS];
int totalsparks, sparksalive;
straferec strafes[NUMSTRAFES];
linerec *kindptrs[L_NUMKINDS], *firstwhite;



black_terrain(thekind)
register int thekind;
{
	register linerec *p;
	register int left, right, top, bot;
	
	if (p = kindptrs[thekind])
	{
		right = screenr;
		bot = screenb;
		left = screenx - 10;
		top = screeny - 6;
		if (p->startx < right)
		{
			asm					/* find first quickly */
			{
						bra.s	@enter1
						
				@loop1	move.l	OFFSET(linerec, next)(p), p
				@enter1	move.l	p, D0
						beq.s	@out
						cmp.w	OFFSET(linerec, endx)(p), left
						bgt.s	@loop1
				@out
			}
			for(; p && p->startx < right; p = p->next)
				if (p->endx >= left && 
						(p->starty >= top || p->endy >= top) &&
						(p->starty < bot || p->endy < bot))
					BLACK_LINE_Q(p, screenx, screeny);
		}
		right -= worldwidth;
		for(p = kindptrs[thekind]; p && p->startx < right; p = p->next)
			if (	(p->starty >= top || p->endy >= top) &&
					(p->starty < bot || p->endy < bot))
				BLACK_LINE_Q(p, screenx-worldwidth, screeny);
	}
}


white_terrain()
{
	register linerec *p;
	register int left, right, top, bot;
	
	fast_whites();
	
	fast_hashes();
	
	right = screenr;
	left = screenx - 10;
	top = screeny - 6;
	bot = screenb;
	for (p = firstwhite; p && p->endx < left; p = p->nextwh)
		;
	for(; p && p->startx < right; p = p->nextwh)
		if (p->endx >= left &&
				(p->starty >= top || p->endy >= top) &&
				(p->starty < bot || p->endy < bot))
			nne_white(p, screenx, screeny);
	right -= worldwidth;
	for(p = firstwhite; p && p->startx < right; p = p->nextwh)
		if (	(p->starty >= top || p->endy >= top) &&
				(p->starty < bot || p->endy < bot))
			nne_white(p, screenx-worldwidth, screeny);
}


set_life(sp, ignoreline)
register shotrec *sp;
linerec *ignoreline;
{
	register int x2, world8;
	
	world8 = worldwidth << 3;
	sp->strafedir = -1;			/* no strafe unless it hits something */
	sp->hitline = NULL;
	
	get_life(sp, ignoreline);
	
	x2 = (sp->x8 + sp->lifecount * sp->h) >> 3; /* compute endpoint of shot*/
	if (worldwrap)
		if (x2 < 0)
		{	sp->x8 += world8;
			get_life(sp, ignoreline);
			sp->x8 -= world8;
		}
		else if (x2 > worldwidth)
		{	sp->x8 -= world8;
			get_life(sp, ignoreline);
			sp->x8 += world8;
		}
}

	

get_life(sp, ignoreline)
register shotrec *sp;
linerec *ignoreline;
{
	register int m1, x2, y2, y0;
	register linerec *line;
	int x0, life, shortest, totallife;
	long m2;
	extern int slopes2[];
	
	shortest = sp->lifecount;				/* assume it won't hit any */
	totallife = shortest + sp->btime;
	sp->x = sp->x8 >> 3;
	sp->y = sp->y8 >> 3;
	x2 = (sp->x8 + sp->h * shortest) >> 3;
	y2 = (sp->y8 + sp->v * shortest) >> 3;
	
	for (line = lines; line->type; line++)
	  if (sp->x < line->startx && x2 < line->startx) break;	/* save time */
	  else
		if(line->kind != L_GHOST && line != ignoreline &&
				(sp->x < line->endx || x2 < line->endx))
			if (line->type == LINE_N) 
			{	y0 = sp->y + (sp->v * (line->startx - sp->x)) / sp->h;
				if(y0 >= line->starty && y0 <= line->starty+line->length)
				{	life = ((line->startx - sp->x) << 3) / sp->h;
					if (life < shortest)
					{	shortest = life;
						sp->strafedir = getstrafedir(line, sp->x, sp->y);
						sp->hitline = line;
						x2 = (sp->x8 + sp->h * shortest) >> 3;
						y2 = (sp->y8 + sp->v * shortest) >> 3;
					}
				}
			}
			else
		{
			m1 = line->up_down * slopes2[line->type];
		
			if (sp->y - line->starty < m1 * (sp->x - line->startx) / 2)
			{	if (y2 - line->starty < m1 * (x2 - line->startx) / 2)
					continue;
			}
			else if (y2 - line->starty > m1 * (x2 - line->startx) / 2)
				continue;
	
			if(sp->h == 0) 
			{	if (sp->x >= line->startx && sp->x <= line->endx)
				{	
					y0 = line->starty + (sp->x - line->startx) * m1 / 2;
					life = ((y0 - sp->y) << 3) / sp->v;
					if (life < shortest)
					{	shortest = life;
						sp->strafedir = getstrafedir(line, sp->x, sp->y);
						sp->hitline = line;
						x2 = (sp->x8 + sp->h * shortest) >> 3;
						y2 = (sp->y8 + sp->v * shortest) >> 3;
					}
				}
				continue;
			}
		
			m2 = ((long) sp->v << 8) / (long) sp->h;
		
			if ( (long) m1 << 7 == m2) continue; 	/* avoid /0 error	*/
		
			x0 = (int) (( ((long) (sp->y8 - (line->starty<<3)) << 8) + 
						   (((long) m1 * (long) line->startx) << 10) - 
						   (m2 * (long) sp->x8)     )
							 / (((long) m1 << 7) - m2) );
		
			if (x0 / 8 >= line->startx && x0 / 8 <= line->endx)
			{
				life = (x0 - sp->x8) / sp->h;
				if (life < shortest)
				{	shortest = life;
					sp->strafedir = getstrafedir(line, sp->x, sp->y);
					sp->hitline = line;
					x2 = (sp->x8 + sp->h * shortest) >> 3;
					y2 = (sp->y8 + sp->v * shortest) >> 3;
				}
			}
		}
	sp->lifecount = shortest;
	if (sp->hitline != NULL && sp->hitline->kind == L_BOUNCE)
		sp->btime = totallife - shortest;
	else
		sp->btime = 0;
}



char bouncedirtable[2][11] = {
	{ 8,  7,  6,  5, -1, -1, -1, 11, 10, 9, 8},
	{ 0, 15, 14, 13, -1, -1, -1,  3,  2, 1, 0}};

char stdirtable[2][11] = {
	{ 8,  7,  6,  5, -1, -1, -1, -1, -1, 9, 8},
	{ -1, -1, -1, -1, -1, -1, -1,  3,  2, 1, -1}};

int getstrafedir(line, x1, y1)
register linerec *line;
register int x1, y1;
{
	int above, m2, y0;
	
	if (line->type == LINE_N)
		if (x1 > line->startx)
			return(4);
		else if (line->kind == L_BOUNCE)
			return(12);
		else
			return(-1);
	else
	{	m2 = line->up_down * slopes2[line->type];
		y0 = line->starty +
				(m2 * (x1 - line->startx) >> 1);
		above = y1 < y0;
		return((line->kind == L_BOUNCE ? bouncedirtable : stdirtable)
							[above][5 + line->type * line->up_down]);
	}
}



do_fuels()
{
	register fuelrec *fp;
	register int f, flash;
	
	flash = rint(NUMFUELS);		/* # must be >= NUMFUELS */
	
	for (fp=fuels, f=0; fp->x < 10000; fp++, f++)
		if (fp->alive)
			if (f == flash)
			{
				fp->currentfig = (FUELFRAMES-2) + rint(2);
				fp->figcount = 1;
			}
			else if (!fp->figcount--)
			{	
				if (++(fp->currentfig) >= (FUELFRAMES-2))
					fp->currentfig = 0;
				fp->figcount = 1;
			}
	draw_fuels(screenx, screeny);
	if (on_right_side)
		draw_fuels(screenx-worldwidth, screeny);
}

	
draw_fuels(scrnx, scrny)
int scrnx, scrny;
{
	register fuelrec *fp;
	register int left, right, fuely, rot;
	extern Fuel_Pic *fuel_defs, *fuel_masks;
	
	left = scrnx - FUELCENTER;
	right = scrnx + (FUELCENTER + SCRWTH);
	for (fp=fuels; fp->x < 10000; fp++)
		if (fp->x > left && fp->x < right)
		{	
			fuely = fp->y - scrny - FUELCENTER;
			if (fuely > -FUELHT && fuely < VIEWHT)
			{
				rot = (fp->x + fp->y) & 1;
				draw_medium(fp->x - scrnx - FUELCENTER, fuely,
					fuel_images[rot][fp->currentfig], FUELHT);
			}
		}
}



start_explosion(startx, starty, dir, kind)
int startx, starty, dir, kind;
{
	register shardrec *sp;
	shardrec *sh;
	register shotrec *shot;
	register int i, shard, angle, speed;
	int loangle, hiangle;
	
	
	for (i=0; i < EXPLSHARDS; i++)
	{												/* find oldest shard */
		sh = shards;
		for(sp=shards; sp < shards+NUMSHARDS; sp++)
			if (sp->lifecount < sh->lifecount)
				sh = sp;
		sp = sh;							/* use the register variable */
		
		if (kind >= BUNKROTKINDS)
			angle = rint(32);
		else
			angle = (rint(16-1) - 7 + (dir<<1)) & 31;
		speed = SH_SPEED + rint(SH_ADDSPEED);
		sp->h = shotvecs[angle] * speed;
		sp->v = shotvecs[(angle + 24) & 31] * speed;
		sp->x = startx + rint(SH_DISTRIB) - SH_DISTRIB/2;
		sp->y = starty + rint(SH_DISTRIB) - SH_DISTRIB/2;
		sp->lifecount = SH_LIFE + rint(SH_ADDLIFE);
		sp->rot16 = rint(256);
		sp->rotspeed = rint(SH_SPIN2) - SH_SPIN2/2;
		if (kind == 1 && (dir & 1) == 0)
			sp->kind = ((dir & 3) ? 6 : 5);
		else
			sp->kind = kind;
	}
	
	if (totalsparks == NUMSPARKS && sparksalive) return;
									/* don't interrupt ship explosion	*/
	if (kind >= BUNKROTKINDS)
	{
		loangle = 0;
		hiangle = 511;
	}
	else
	{
		loangle = ((dir-4) & 15) << (4 + 1);	/* 0-511 */
		hiangle = (loangle + 512/2);			/* around 180 degrees */
	}
	totalsparks = sparksalive = EXPLSPARKS;
	for (shot=sparks; shot < sparks+EXPLSPARKS; shot++)
	{	shot->x8 = startx << 3;
		shot->y8 = starty << 3;
		shot->lifecount = SPARKLIFE + rint(SPADDLIFE);
		rand_shot(loangle, hiangle, shot);
		speed = 8 + rint(SP_SPEED16);
		shot->h = (speed * shot->h) >> 4;
		shot->v = (speed * shot->v) >> 4;
	}
}



start_strafe(x, y, dir)
int x, y, dir;
{
	register straferec *str, *p;
	
	if (dir < 0) return;		/* no strafe on that one */
	
	str=strafes;
	for(p = strafes; p < strafes+NUMSTRAFES && str->lifecount; p++)
		if (p->lifecount < str->lifecount)
			str = p;
	str->x = x;
	str->y = y;
	str->lifecount = STRAFE_LIFE;
	str->rot = dir;
}



do_strafes()
{
	register straferec *str;
	
	for(str=strafes; str < &strafes[NUMSTRAFES]; str++)
		if(str->lifecount)
		{	str->lifecount--;
			draw_strafe(str->x, str->y, str->rot, screenx, screeny);
		}
}



start_death()
{
	set_screen(front_screen, 0L);			/*	this is obnoxious!	*/
	start_sound(EXP2_SOUND);

	start_blowup((shipx + screenx) % worldwidth, shipy + screeny,
					SHIPSPARKS,
					16, SH_SP_SPEED16,
					SH_SPARKLIFE, SH_SPADDLIFE);
}



start_blowup(x, y, numspks, minsp, addsp, minlife, addlife)
register int x, y;
int numspks, minsp, addsp, minlife, addlife;
{
	register int speed;
	register shotrec *shot;

	x <<= 3;
	y <<= 3;
	totalsparks = sparksalive = numspks;
	for (shot=sparks; shot < sparks+numspks; shot++)
	{	shot->x8 = x;
		shot->y8 = y;
		shot->lifecount = minlife + rint(addlife);
		rand_shot(0, 511, shot);
		speed = minsp + rint(addsp);
		shot->h = (speed * shot->h) >> 4;
		shot->v = (speed * shot->v) >> 4;
	}
}



draw_explosions()
{
	register shardrec *sp;
	register shotrec *shot;
	register int bot, right, i, worldwth8;
	int xg, yg;
	
	right = screenr - SHARDHT;
	bot = screenb - SHARDHT;
	for(sp=shards, i=0; i < NUMSHARDS; sp++, i++)
		if(sp->lifecount)
		{	sp->lifecount--;
			sp->h -= sp->h >> SH_SLOW;
			sp->v -= sp->v >> SH_SLOW;
			gravity_vector(sp->x, sp->y, &xg, &yg);
			sp->h += xg << 2;
			sp->v += yg << 2;
			sp->x += sp->h >> 8;
			sp->y += sp->v >> 8;
			sp->rot16 = (sp->rot16 + sp->rotspeed) & 255;
			if (sp->y > screeny && sp->y < bot)
			{	if (sp->x > screenx && sp->x < right)
					draw_shard(sp->x-screenx, sp->y-screeny,
						shard_images[sp->kind][(sp->x+sp->y) & 1]
									[sp->rot16 >> 4], SHARDHT);
				if (worldwrap && 
					sp->x > screenx-worldwidth && sp->x < right-worldwidth)
					draw_shard(sp->x-screenx+worldwidth, sp->y-screeny,
						shard_images[sp->kind][(sp->x+sp->y) & 1]
									[sp->rot16 >> 4], SHARDHT);
			}
		}
	worldwth8 = worldwidth << 3;
	right = screenr - 1;
	bot = screenb - 1;
	if (sparksalive)
		for(shot=sparks, i=0; i < totalsparks; shot++, i++)
			if(shot->lifecount)
			{	if ( !--shot->lifecount) sparksalive--;
				shot->h -= (shot->h+4) >> 3;
				shot->v -= (shot->v+4) >> 3;
				shot->x8 += shot->h;
				shot->y8 += shot->v;
				if(shot->x8 < 0)	shot->x8 += worldwth8;
				if(shot->y8 < 0)	shot->lifecount = 0;
				if(shot->x8 >= worldwth8)
					shot->x8 -= worldwth8;
				shot->x = shot->x8 >> 3;
				shot->y = shot->y8 >> 3;
				if (shot->y >= screeny && shot->y < bot)
					if(shot->x >= screenx && shot->x < right)
						draw_spark_safe(shot->x - screenx, shot->y - screeny);
					else if(on_right_side && shot->x < screenr-worldwidth)
						draw_spark_safe(shot->x - screenx + worldwidth, 
									shot->y - screeny);
			}
}



draw_craters()
{
	register craterrec *crat, *end;
	register int top, bot, left, right;
	
	top = screeny - CRATERCENTER;
	bot = screenb + CRATERCENTER;
	left = screenx - CRATERCENTER;
	right = screenr + CRATERCENTER;
	end = craters + numcraters;
	for (crat=craters; crat < end; crat++)
		if (crat->y >= top && crat->y <= bot)
			if (crat->x >= left && crat->x < right)
				draw_medium(crat->x - screenx - CRATERCENTER,
							crat->y - screeny - CRATERCENTER,
							crater_images[(crat->x + crat->y) & 1], CRATERHT);
			else if (on_right_side && crat->x < right - worldwidth)
				draw_medium(crat->x - screenx + worldwidth - CRATERCENTER,
							crat->y - screeny - CRATERCENTER,
							crater_images[(crat->x + crat->y) & 1], CRATERHT);
}




