/*
	Gravity Well Planet Editor Graphics Routines

	Copyright (c) 1986-88 Randall H. Wilson 
*/


#include "GW.h"


extern int intfilter();

extern linerec lines[NUMLINES];
extern bunkrec bunkers[NUMBUNKERS];
extern fuelrec fuels[NUMFUELS];
extern craterrec craters[];

extern int worldwidth, worldheight, worldwrap, shootslow;
extern int xstart, ystart;
extern int planetbonus, gravx, gravy, numcraters;

extern int slopes2[];
extern int ylength[];
extern int xlength[];
extern int xbshotstart[][16], ybshotstart[][16],
			xbcenter[][16], ybcenter[][16];

extern Bunker_Pic *bunker_defs, *bunker_masks;
extern Fuel_Pic *fuel_defs;
extern Ship_Pic *ship_defs;
extern Crater_Pic crater_def;

extern int screenx, screeny, xstart, ystart,
	screenr, screenb, on_right_side;

extern int currentlevel, planets;

extern Rect iconrect, planrect, moderect, kindrect, objrect;
extern WindowPtr editwin;
extern int rounding, show_angles, show_linetypes;
extern RgnHandle origclip;

extern int pointertype, linekind, bunkkind;
extern CursHandle modecursors[];

extern int changed, selecttype, selectnum;

char stripes[8] = {0x11, 0x22, 0x44, 0x88, 0x11, 0x22, 0x44, 0x88};
int mask_sign[12] =	  {0x1F00, 0x3F80, 0x7FC0, 0xFFE0, 0xFFE0, 0xFFE0,
					   0xFFE0, 0xFFE0, 0x7FC0, 0x3F80, 0x1F00, 0x0000};
int bounce_sign[12] = {0x1F00, 0x3F80, 0x71C0, 0xF6E0, 0xF6E0, 0xF1E0,
					   0xF6E0, 0xF6E0, 0x71C0, 0x3F80, 0x1F00, 0x0000};
int ghost_sign[12] =  {0x1F00, 0x2080, 0x4E40, 0x8920, 0x8920, 0x8E20,
					   0x8820, 0x8820, 0x4840, 0x2080, 0x1F00, 0x0000};

Rect bunkrect = {163, 1, 190, 30};


drawicons()
{
	register int y;
	CursHandle arrowbut;
	
	EraseRect(&iconrect);
	MoveTo(iconrect.right-1, iconrect.top);
	LineTo(iconrect.right-1, iconrect.bottom);
	for (y=31; y < 128; y+=32)
	{
		MoveTo(0, y);
		LineTo(31, y);
	}
	xferbits(&arrow, 2, 16, 16, 12, 8, srcOr);	/* draw an arrow */
	xferbits(*modecursors[ERASEPTR], 2, 16, 16, 8, 40, srcOr);	/* eraser */
	xferbits(crater_def, 4, 32, CRATERHT, 0, 64, srcOr);/* crater */
	xferbits(ship_defs[0], 4, SHIPHT, SHIPHT, 0, 100, srcOr);	/* shipptr*/
	
	for (y=129; y < 162; y+=32)
	{
		MoveTo(0, y);
		LineTo(31, y);
	}
	MoveTo(0, 209);
	LineTo(31, 209);
	showfuel(16, 145);
	ClipRect(&bunkrect);
	showbunk(16, 176 + (bunkkind >= BUNKROTKINDS ? 0:13), 0, bunkkind);
	SetClip(origclip);
	arrowbut = GetCursor(256);
	xferbits(*arrowbut, 2, 16, 16, 1, 194, srcOr);
	arrowbut = GetCursor(257);
	xferbits(*arrowbut, 2, 16, 16, 13, 194, srcOr);
	
	for (y=211; y < 260; y +=24)
	{
		MoveTo(0, y);
		LineTo(31, y);
		MoveTo(4, y+6);
		LineTo(28, y+18);
	}
	MoveTo(0, 284);
	LineTo(31, 284);
	xferbits(bounce_sign, 2, 11, 11, 16-5, 248-5, srcCopy);	/* bounce */
	xferbits(ghost_sign, 2, 11, 11, 16-5, 272-5, srcCopy);	/* ghost */
	
	selectmode(pointertype);
}


selectmode(modenum)
int modenum;
{
	Rect therect;
	register int y;
	
	if (modenum < LINEPTR)
	{
		y = modenum * 32;
		SETRECT(therect, 0, y, 31, y+31);
		InvertRect(&therect);
	}
	else
	{
		y = 212 + linekind * 24;
		SETRECT(therect, 0, y, 31, y+23);
		InvertRect(&therect);
	}
}

docursor(cursnum)
int cursnum;
{
	if (cursnum)
		SetCursor(*modecursors[cursnum]);
	else
		InitCursor();
}


drawcontent()
{
	register linerec *line;
	register bunkrec *b;
	register fuelrec *f;
	craterrec *crat;
	register int i, left, right, x;
	int midx, midy, *data;
	
	SetPort(editwin);
	EraseRect(&planrect);
	
	PenPat(stripes);
	MoveTo(worldwidth-screenx, 0);
	LineTo(worldwidth-screenx, 400);
	PenNormal();
	for (i=0, left = screenx; i < 2; i++, left -= worldwidth)
	{	
		right = left + (EDWINWTH+30);
		for (line=lines; line->startx < right; line++)
			if (line->endx >= left)
			{	
				draw_wall(line->startx - left, line->starty - screeny,
							line->endx - left, line->endy - screeny);
				if (line->kind && show_linetypes)
				{
					midx = (line->startx + line->endx) / 2 - left - 5;
					midy = (line->starty + line->endy) / 2 - screeny - 5;
					xferbits(mask_sign, 2, 12, 12, midx, midy, srcBic);
					xferbits(line->kind==L_BOUNCE ? bounce_sign:ghost_sign,
							2, 12, 12, midx, midy, srcOr);
				}
			}
		for (b=bunkers; b->x < right; b++)
		{	
			showbunk(b->x - left, b->y - screeny, b->rot, b->kind);
			if (show_angles ||
					(selecttype==BUNK_T && selectnum == b-bunkers))
				showfangles(b, left, screeny);
		}
		for (f=fuels; f->x < right; f++)
			showfuel(f->x - left, f->y - screeny);
		for (crat=craters; crat < craters + numcraters; crat++)
			showcrater(crat->x - left, crat->y - screeny);
		xferbits(ship_defs[0], 4, SHIPHT, SHIPHT,
				xstart - left - SCENTER,
				ystart - screeny - SCENTER, srcOr);
	}
}


draw_wall(x1, y1, x2, y2)
register int x1, y1, x2, y2;
{
	PenState oldpen;
	int horiz;
	extern char horizstripes[], vertstripes[], hash_figure[];
	extern int show_3D;
	
	GetPenState(&oldpen);
	PenMode(patOr);
	
	PenPat(black);
	horiz = x2 - x1 > abs(y1-y2);
	
	if (horiz)
		PenSize(1, 2);
	else
		PenSize(2, 1);
	MoveTo(x1, y1);
	LineTo(x2, y2);
	
	if (show_3D)
	{
		Move(9, 5);
		
		PenSize(1, 1);
		PenPat(horiz ? vertstripes : horizstripes);
		Line(x1 - x2, y1 - y2);
		
		xferbits(hash_figure, 2, 16, 6, x1, y1, srcOr);
		xferbits(hash_figure, 2, 16, 6, x2, y2, srcOr);
	}
	SetPenState(&oldpen);
}


xferbits(data, rowbytes, width, height, x, y, mode)
char *data;
int rowbytes, width, height, x, y, mode;
{
	BitMap bits;
	Rect destrect;
	
	bits.baseAddr = data;
	bits.rowBytes = rowbytes;
	SETRECT(bits.bounds, 0, 0, width, height);
	SETRECT(destrect, x, y, x+width, y+height);
	CopyBits(&bits, &editwin->portBits,
			&bits.bounds, &destrect,
			mode, NULL);
}


showcrater(x, y)
int x, y;
{
	xferbits(crater_def, 4, 32, CRATERHT,
			x - CRATERCENTER, y - CRATERCENTER, srcOr);
}

showfuel(x, y)
int x, y;
{
	xferbits(fuel_defs[0], 4, FUELHT, FUELHT,
				x - FUELCENTER, y - FUELCENTER, srcOr); 
}

showbunk(x, y, rot, kind)
int x, y, rot, kind;
{
	if (kind < BUNKROTKINDS && rot >= 2 && rot <= 12)
		xferbits(bunker_masks[kind][rot], 6, BUNKHT, BUNKHT,
				x - xbcenter[kind][rot], y - ybcenter[kind][rot], srcBic);
	xferbits(bunker_defs[kind][rot], 6, BUNKHT, BUNKHT,
				x - xbcenter[kind][rot], y - ybcenter[kind][rot], srcOr);
}

showfangles(b, scrx, scry)
register bunkrec *b;
int scrx, scry;
{
	register int i, top, left;
	int start, arc;
	Rect around;
	PenState oldpen;
	
	if (!has_fire_angles(b))
		return;

	left = b->x + xbshotstart[b->kind][b->rot];
	left+= - scrx - FANGLESIZE;
	top  = b->y + ybshotstart[b->kind][b->rot];
	top += - scry - FANGLESIZE;
	SETRECT(around, left, top, left + 2*FANGLESIZE, top + 2*FANGLESIZE);
	
	if (top < EDWINHT && left < EDWINWTH &&
				around.right > 0 && around.bottom > 0)
	{
		GetPenState(&oldpen);
		PenMode(patOr);
		for (i=0; i<2; i++)
		{
			start = (int) (((long) b->ranges[i].low * 360) / 512);
			arc = (int) (((long) b->ranges[i].high * 360) / 512) - start;
			PenPat(ltGray);
			PaintArc(&around, start, arc);
			PenPat(black);
			FrameArc(&around, start, arc);
			around.left += 10;
			around.top += 10;
			around.right -= 10;
			around.bottom -= 10;
		}
		SetPenState(&oldpen);
	}
	if (selecttype==BUNK_T && b == bunkers + selectnum)
		for (i=0; i < 4; i++)
		{
			setfirerect(b, i, &around);
			OffsetRect(&around, -scrx, -scry);
			EraseOval(&around);
			FrameOval(&around);
		}
}
			
	

pascal void scrollproc(thecontrol, partcode)
ControlHandle thecontrol;
int partcode;
{
	cscrollproc(thecontrol, partcode);
}

cscrollproc(thecontrol, partcode)
ControlHandle thecontrol;
int partcode;
{
	int oldpos, change, newpos, ymove=0, xmove=0;
	RgnHandle update, oldclip;
	PenState savepen;
	
	GetPenState(&savepen);
	oldclip = NewRgn();
	GetClip(oldclip);
	oldpos = GetCtlValue(thecontrol);
	switch(partcode)
	{
		case inUpButton:
			change = -SCROLLSPEED;
			break;
		case inDownButton:
			change = SCROLLSPEED;
			break;
		case inPageUp:
			change = -PAGESPEED;
			break;
		case inPageDown:
			change = PAGESPEED;
			break;
		default:
			return;
	}
	newpos = oldpos + change;
	SetClip(origclip);		/* allow redrawing of scrollbars */
	if (GetCRefCon(thecontrol) == VERTSBAR)
	{
		SetCtlValue(thecontrol, newpos);
		screeny = GetCtlValue(thecontrol);
		ymove = screeny - oldpos;
	}
	else if (worldwrap)
	{
		xmove = change;
		screenx = (newpos + worldwidth) % worldwidth;
		SetCtlValue(thecontrol, screenx);
	}
	else
	{
		SetCtlValue(thecontrol, newpos);
		screenx = GetCtlValue(thecontrol);
		xmove = screenx - oldpos;
	}
	calcextras();
	SetClip(oldclip);
	update = NewRgn();
	ScrollRect(&planrect, -xmove, -ymove, update);
	SetClip(update);
	drawcontent();
	SetClip(oldclip);
	DisposeRgn(update);
	DisposeRgn(oldclip);
	SetPenState(&savepen);
}


arrowstuff(startpt)
Point startpt;
{
	register fuelrec *fuel;
	register bunkrec *bunk;
	Point thept, linestart, newpt;
	Rect frect;
	long pt2line(), pt2xy();
	int i, dx, dy, angle, *rptr;
	extern int doubleclick;
	
	thept = startpt;
	InvalRect(&planrect);
	
	bunk = bunkers + selectnum;
	if (selecttype == BUNK_T && has_fire_angles(bunk))
	{
		bunk = bunkers + selectnum;
		for (i=0; i < 4; i++)
		{
			setfirerect(bunk, i, &frect);
			unworldadjust(&frect.top);
			unworldadjust(&frect.bottom);
			if (PtInRect(startpt, &frect))
				break;
		}
		if (i < 4)
		{
			ClipRect(&planrect);
			PenMode(patXor);
			linestart.h = bunk->x + xbshotstart[bunk->kind][bunk->rot];
			linestart.v = bunk->y + ybshotstart[bunk->kind][bunk->rot];
			unworldadjust(&linestart);
			MoveTo(linestart.h, linestart.v);
			LineTo(thept.h, thept.v);
			while(StillDown())
			{
				GetMouse(&newpt);
				if (EqualPt(thept, newpt))
					continue;
				MoveTo(linestart.h, linestart.v);
				LineTo(thept.h, thept.v);
				thept = newpt;
				MoveTo(linestart.h, linestart.v);
				LineTo(thept.h, thept.v);
			}
			PenNormal();
			SETRECT(frect, linestart.h - 20, linestart.v - 20,
					linestart.h + 20, linestart.v + 20);
			PtToAngle(&frect, thept, &angle);
			rptr = (int *) bunk->ranges + i;
			*rptr = ((long) angle * 512) / 360;
			if (i&1)
				rptr--;
			if (*rptr > rptr[1])
				rptr[1] += 512;
			if (*rptr < rptr[1] - 512)
				rptr[1] -= 512;
			changed = TRUE;
			SetClip(origclip);
			return;
		}
	}
	worldadjust(&startpt);
	selecttype = NONE_T;
	for (bunk=bunkers; bunk->rot >= 0; bunk++)
		if (pt2xy(&startpt, bunk->x + xbshotstart[bunk->kind][bunk->rot] / 2,
					bunk->y + ybshotstart[bunk->kind][bunk->rot] / 2) < 150)
		{
			if (doubleclick && bunk->kind == GENERATORBUNK)
				set_attraction(bunk);
			else
				dragbunk(bunk, &thept);
			changed = TRUE;
			return;
		}
	for (fuel=fuels; fuel->x < 10000; fuel++)
		if (pt2xy(&startpt, fuel->x, fuel->y) < 150)
		{
			dragfuel(fuel, &thept);
			changed = TRUE;
			return;
		}
}


int has_fire_angles(b)
register bunkrec *b;
{
	return(b->kind == WALLBUNK || b->kind == GROUNDBUNK ||
			(b->kind == DIFFBUNK && (b->rot & 3) != 0));
}


set_attraction(bunk)
register bunkrec *bunk;
{
	register DialogPtr dptr;
	int itemhit, correct, current;
	
	current = bunk->ranges[0].low;
	
	dptr = GetNewDialog(13, NULL, -1L);
	frame_default(dptr);
	SetDNum(dptr, 3, abs(current));
	SelIText(dptr, 3, 0, 100);
	SetItemValue(dptr, 4, current >= 0);
	SetItemValue(dptr, 5, current < 0);
	do
	{
		do
		{
			ModalDialog(intfilter, &itemhit);
			if (itemhit >= 4)
			{
				SetItemValue(dptr, 4, itemhit == 4);
				SetItemValue(dptr, 5, itemhit == 5);
			}
		} while (itemhit != 1);
		correct = TRUE;
		current = dlogvalue(dptr, 3, 0, 100, &correct);
		if (!correct)
			SysBeep(10);
	} while (!correct);
	bunk->ranges[0].low = (GetItemValue(dptr, 4) ? current : -current);
	DisposDialog(dptr);
}


swapmem(p1, p2, numbytes)
register char *p1, *p2;
register int numbytes;
{
	register char temp;
	
	while(--numbytes >= 0)
	{
		temp = *p1;
		*p1++ = *p2;
		*p2++ = temp;
	}
}


dragobject(rot, pt, dx, dy, isbunk, kind)
int rot, dx, dy, isbunk, kind;	/* isbunk true iff the object is a bunker */
register Point *pt;
{
	Rect startrect;
	Point oldpt;
	
	SETRECT(startrect, pt->h-1, pt->v-1, pt->h+2, pt->v+2);
	while(StillDown())		/* wait until moved a certain amount */
	{
		GetMouse(&oldpt);
		if (!PtInRect(oldpt, &startrect))
			break;
	}
	while(StillDown())
	{
		oldpt = *pt;
		GetMouse(pt);
		if (pt->h == oldpt.h && pt->v == oldpt.v)
			continue;
		if (isbunk)
		{
			xferbits(bunker_defs[kind][rot], 6, BUNKHT, BUNKHT,	/* erase old */
					oldpt.h - dx - xbcenter[kind][rot],
					oldpt.v - dy - ybcenter[kind][rot], srcXor);
			xferbits(bunker_defs[kind][rot], 6, BUNKHT, BUNKHT,	/* draw new */
					pt->h - dx - xbcenter[kind][rot],
					pt->v - dy - ybcenter[kind][rot], srcXor);
		}
		else
		{
			xferbits(fuel_defs[0], 4, FUELHT, FUELHT,	/* erase old */
					oldpt.h - dx - FUELCENTER,
					oldpt.v - dy - FUELCENTER, srcXor);
			xferbits(fuel_defs[0], 4, FUELHT, FUELHT,	/* draw new */
					pt->h - dx - FUELCENTER,
					pt->v - dy - FUELCENTER, srcXor);
		}
	}
}


dragfuel(fuel, startpt)		/* startpt in local coords */
register fuelrec *fuel;
register Point *startpt;
{
	int dx, dy;
	Point thept;
	
	ClipRect(&planrect);
	thept = *startpt;
	worldadjust(startpt);
	dx = startpt->h - fuel->x;
	dy = startpt->v - fuel->y;
	dragobject(0, &thept, dx, dy, FALSE, 0);
	SetClip(origclip);
	
	if (!PtInRect(thept, &planrect))
		return;
	worldadjust(&thept);
	
	fuel->x = thept.h - dx;
	if (fuel->x < 20)
		fuel->x = 20;
	if (fuel->x > worldwidth - 20)
		fuel->x = worldwidth - 20;
	fuel->y = thept.v - dy;
	if (fuel->y < 20)
		fuel->y = 20;
	if (fuel->y > worldheight - 20)
		fuel->y = worldheight - 20;
	
	for ( ; fuel > fuels && fuel->x < (fuel-1)->x; fuel--)
		swapmem(fuel, fuel-1, sizeof(fuelrec));
	for ( ; fuel->x > (fuel+1)->x; fuel++)
		swapmem(fuel, fuel+1, sizeof(fuelrec));
	selecttype = FUEL_T;
	selectnum = fuel - fuels;
}


dragbunk(bunk, startpt)
register bunkrec *bunk;
register Point *startpt;
{
	int dx, dy;
	Point thept;
	
	ClipRect(&planrect);
	thept = *startpt;
	worldadjust(startpt);
	dx = startpt->h - bunk->x;
	dy = startpt->v - bunk->y;
	xferbits(bunker_defs[bunk->kind][bunk->rot], 6, BUNKHT, BUNKHT,	/* select */
			thept.h - dx - xbcenter[bunk->kind][bunk->rot],
			thept.v - dy - ybcenter[bunk->kind][bunk->rot],
			srcOr);
	dragobject(bunk->rot, &thept, dx, dy, TRUE, bunk->kind);
	SetClip(origclip);

	if (!PtInRect(thept, &planrect))
		return;
	worldadjust(&thept);

	bunk->x = thept.h - dx;
	if (bunk->x < 20)
		bunk->x = 20;
	if (bunk->x > worldwidth - 20)
		bunk->x = worldwidth - 20;
	bunk->y = thept.v - dy;
	if (bunk->y < 20)
		bunk->y = 20;
	if (bunk->y > worldheight - 20)
		bunk->y = worldheight - 20;

	for ( ; bunk > bunkers && bunk->x < (bunk-1)->x; bunk--)
		swapmem(bunk, bunk-1, sizeof(bunkrec));
	for ( ; bunk->x > (bunk+1)->x; bunk++)
		swapmem(bunk, bunk+1, sizeof(bunkrec));
	selecttype = BUNK_T;
	selectnum = bunk - bunkers;
}


setfirerect(b, i, therect)
register bunkrec *b;
int i;
Rect *therect;
{
	int len, angle, xtip, ytip, x, y;
	extern char sine_wave[];
	
	angle = (((int *) b->ranges)[i] / 2) & 255;
	len = i < 2 ? FANGLESIZE : FANGLESIZE-10;
	xtip = b->x + xbshotstart[b->kind][b->rot];
	ytip = b->y + ybshotstart[b->kind][b->rot];
	x = xtip + ((sine_wave[angle] & 255) - 128) * len / 64;
	y = ytip + ((sine_wave[(angle+192)&255] & 255) - 128) * len / 64;
	SETRECT(*therect, x-4, y-4, x+4, y+4);
}
	
	

newobject(startpt)
Point startpt;
{
	register bunkrec *bunk;
	register fuelrec *fuel;
	Point thept;
	Rect arrowrect;
	extern int doubleclick;
	int right;
	CursHandle arrowcurs;
	
	thept = startpt;
	worldadjust(&thept);
	switch ((startpt.v - 130) / 32)
	{
	case 0:
		for (fuel = fuels; fuel->x < 10000; fuel++)
			;
		if (++fuel >= fuels+NUMFUELS)
		{
			text_alert("\pOnly 14 fuel cells are allowed");
			return;							/* no space for the fuel	*/
		}
		fuel->x = screenx + 16;
		fuel->y = screeny + 145;
		fuel->alive = TRUE;
		dragfuel(fuel, &startpt);
		break;
	case 1:
		for (bunk = bunkers; bunk->rot >= 0; bunk++)
			;
		if (++bunk >= bunkers+NUMBUNKERS)
		{
			text_alert("\pOnly 24 guns are allowed");
			return;							/* no space for the bunk	*/
		}
		bunk->x = screenx + 16;
		bunk->y = screeny + 176 + (bunkkind >= BUNKROTKINDS ? 0:13);
		bunk->rot = 0;
		bunk->kind = bunkkind;
		bunk->alive = TRUE;
		bunk->ranges[0].low = (bunkkind == GENERATORBUNK ? 20 : 412);
		bunk->ranges[0].high = 472;
		bunk->ranges[1].low = 40;
		bunk->ranges[1].high = 100;
		dragbunk(bunk, &startpt);
		break;
	case 2:
		right = startpt.h > 16;
		if (right)
			bunkkind++;
		else
			bunkkind--;
		if (bunkkind >= BUNKKINDS)
			bunkkind = 0;
		if (bunkkind < 0)
			bunkkind = BUNKKINDS-1;
			
		ClipRect(&bunkrect);
		EraseRect(&bunkrect);
		showbunk(16, 176 + (bunkkind >= BUNKROTKINDS ? 0:13), 0, bunkkind);
		SetClip(origclip);

		arrowcurs = GetCursor(258 + right);
		xferbits(*arrowcurs, 2, 16, 16, right ? 13 : 1, 194, srcOr);
		while (StillDown())
			;
		SETRECT(arrowrect, 1, 194, 31, 194+14);
		InvalRect(&arrowrect);
		return;
	default:
		return;
	}
	selectmode(pointertype);	/* change to arrow mode */
	pointertype = ARROWPTR;
	selectmode(pointertype);
	InvalRect(&planrect);
	changed = TRUE;
}



int rot2lens[] = {0, 1, 2, 2, 2, 2, 2, 1, 0, -1, -2, -2, -2, -2, -2, -1, 0};
char typetable[] ={LINE_N, LINE_NNE, LINE_NE, LINE_ENE,
					LINE_E, LINE_ENE, LINE_NE, LINE_NNE,
					LINE_N, LINE_NNE, LINE_NE, LINE_ENE,
					LINE_E, LINE_ENE, LINE_NE, LINE_NNE};

linestuff(startpt)
Point startpt;
{
	Rect therect;
	Point curmouse, lastmouse, endpt;
	register int i;
	int virgin, angle, angle16, dx, dy, length, inbounds, endinbounds;
	long dummy;
	register linerec *lp;
	extern int safe_lines;
	
	for(i=0; lines[i].startx < 10000; i++)
		;
	i++;
	if (i >= NUMLINES)
	{
		text_alert("\pOnly 124 lines are allowed");
		return;							/* no space for the line	*/
	}
	worldadjust(&startpt);
	if (rounding)
		roundpoint(&startpt);
	ClipRect(&planrect);
	PenMode(patXor);
	SETRECT(therect, startpt.h - 100, startpt.v - 100,
					 startpt.h + 100, startpt.v + 100);
	virgin = TRUE;
	do
	{
		GetMouse(&curmouse);
		inbounds = PtInRect(curmouse, &planrect);
		if (EqualPt(curmouse, lastmouse) && !virgin && inbounds)
			continue;
		lastmouse = curmouse;
		if (!virgin && endinbounds)
			worldline(&startpt, &endpt);		/* erase the old version */
		virgin = FALSE;
		if (!inbounds)
			moveworld(&curmouse);
		worldadjust(&curmouse);
		
		PtToAngle(&therect, curmouse, &angle);
		angle16 = (angle*2 + 22) / 45 & 15;		/* gives 0-15 */
		dx = curmouse.h - startpt.h;
		dy = curmouse.v - startpt.v;
		if (dx < 0) dx = -dx;
		if (dy < 0) dy = -dy;
		length = max(dx, dy);
		if (safe_lines && length < 26)
			length = 26;
		if (angle16 & 1)		/* ensure odd len on LINE_ENE && LINE_NNE */
			length |= 1;
		endpt.h = startpt.h + length * rot2lens[angle16] / 2;
		endpt.v = startpt.v + length * rot2lens[(angle16+12)&15] / 2;
		endinbounds = (endpt.h >= 0 && endpt.h < worldwidth &&
						endpt.v >= 0 && endpt.v < worldheight);
		
		if (endinbounds)
			worldline(&startpt, &endpt);
		
		Delay(3L, &dummy);
	} while (StillDown());
	PenNormal();
	SetClip(origclip);
	InvalRect(&planrect);
	if (!endinbounds)
		return;
	lp = lines + i;
	if (angle16 > 0 && angle16 < 9)
	{
		lp->startx = startpt.h;
		lp->starty = startpt.v;
		lp->endx = endpt.h;
		lp->endy = endpt.v;
	}
	else
	{
		lp->startx = endpt.h;
		lp->starty = endpt.v;
		lp->endx = startpt.h;
		lp->endy = startpt.v;
	}
	lp->length = length;
	if (angle16 == 0 || (angle16 > 3 && angle16 < 9) || angle16 > 11)
		lp->up_down = L_DN;
	else
		lp->up_down = L_UP;
	lp->type = typetable[angle16];
	lp->kind = linekind;
	while(i > 0 && lines[i].startx < lines[i-1].startx)
	{
		swapmem(lines+i, lines+i-1, sizeof(linerec));
		i--;
	}
	changed = TRUE;
}


worldadjust(thept)
Point *thept;
{
	thept->h = (thept->h + screenx) % worldwidth;
	thept->v += screeny;
}

unworldadjust(thept)
Point *thept;
{
	thept->v -= screeny;
	thept->h -= screenx;
	if (thept->h < -300)
		thept->h += worldwidth;
}


worldline(start, end)
Point *start, *end;
{
	PenState oldpen;
	
	GetPenState(&oldpen);
	if (abs(start->h - end->h) > abs(start->v - end->v))
		PenSize(1, 2);
	else
		PenSize(2, 1);
	MoveTo(start->h - screenx, start->v - screeny);
	LineTo(end->h - screenx, end->v - screeny);
	MoveTo(start->h - screenx + worldwidth, start->v - screeny);
	LineTo(end->h - screenx + worldwidth, end->v - screeny);
	SetPenState(&oldpen);
}


moveworld(thept)
register Point *thept;
{
	ControlHandle thecontrol;
	extern ControlHandle horizsbar, vertsbar;
	
	if (thept->h < planrect.left)
		cscrollproc(horizsbar, inUpButton);
	if (thept->h > planrect.right)
		cscrollproc(horizsbar, inDownButton);
	if (thept->v < planrect.top)
		cscrollproc(vertsbar, inUpButton);
	if (thept->v > planrect.bottom)
		cscrollproc(vertsbar, inDownButton);
}


roundpoint(thept)
Point *thept;
{
	register linerec *lp;
	int dx, dy, dist, d, roundx, roundy, i, roundh, roundv;
	
	dist = ROUNDRADIUS;
	roundh = thept->h;
	roundv = thept->v;
	for (lp = lines; lp->type; lp++)
		for (i = 0; i<2; i++)
		{
			roundx = (i ? lp->startx : lp->endx);
			roundy = (i ? lp->starty : lp->endy);
			dx = roundh - roundx;
			dy = roundv - roundy;
			dx = abs(dx);
			dy = abs(dy);
			if (dx < ROUNDRADIUS/4 && dy < ROUNDRADIUS/4 && 
					(d = dx*dx + dy*dy) < dist)
			{
				thept->h = roundx;
				thept->v = roundy;
				dist = d;
			}
		}
}


erasestuff(startpt, firsttime)
Point startpt;
int firsttime;
{
	register linerec *line;
	fuelrec *fuel;
	register bunkrec *bunk;
	craterrec *crat;
	register long d, dx, dy;
	register int i;
	long dist, pt2line(), pt2xy();
	int thetype;
	
	worldadjust(&startpt);
	dist = 140;
	thetype = NONE_T;
	
	for (fuel=fuels; fuel->x < 10000; fuel++)
		if ( (d = pt2xy(&startpt, fuel->x, fuel->y)) < dist)
		{
			dist = d;
			i = fuel - fuels;
			thetype = FUEL_T;
		}
	for (crat=craters; crat < craters + NUMCRATERS; crat++)
		if ( (d = pt2xy(&startpt, crat->x, crat->y)) < dist)
		{
			dist = d;
			i = crat - craters;
			thetype = CRAT_T;
		}
	for (bunk=bunkers; bunk->rot >= 0; bunk++)
		if ( (d = pt2xy(&startpt,
				bunk->x + xbshotstart[bunk->kind][bunk->rot] / 2,
				bunk->y + ybshotstart[bunk->kind][bunk->rot] / 2)) < dist)
		{
			dist = d;
			i = bunk - bunkers;
			thetype = BUNK_T;
		}
	if (thetype == NONE_T)		/* only erase line if no fuel or bunk */
		for (line=lines; line->type; line++)
			if ( (d = pt2line(&startpt, line)) < dist)
			{
				dist = d;
				i = line - lines;
				thetype = LINE_T;
			}
	switch (thetype)
	{
	case NONE_T:
		if (firsttime)
			SysBeep(10);
		return;
	case LINE_T:
		for ( ; lines[i].type; i++)
			lines[i] = lines[i+1];
		break;
	case FUEL_T:
		for ( ; fuels[i].x < 10000; i++)
			fuels[i] = fuels[i+1];
		break;
	case BUNK_T:
		for ( ; bunkers[i].rot >= 0; i++)
			bunkers[i] = bunkers[i+1];
		break;
	case CRAT_T:
		for ( ; i < numcraters; i++)
			craters[i] = craters[i+1];
		numcraters--;
		break;
	}
	selecttype = NONE_T;
	InvalRect(&planrect);
	changed = TRUE;
}


craterstuff(startpt)
Point startpt;
{
	worldadjust(&startpt);
	
	if (numcraters >= NUMPRECRATS)
	{
		text_alert("\pOnly 25 craters are allowed");
		return;							/* no space for the crater	*/
	}
	else
	{
		craters[numcraters].x = startpt.h;
		craters[numcraters].y = startpt.v;
		numcraters++;
		InvalRect(&planrect);
		changed = TRUE;
	}
}



shipptrstuff(startpt)
Point startpt;
{
	worldadjust(&startpt);
	
	xstart = startpt.h;
	ystart = startpt.v;
	InvalRect(&planrect);
	changed = TRUE;
}


