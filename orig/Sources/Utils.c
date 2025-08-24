/*
	Utils.c
	
	Copyright (c) 1986-88 Randall H. Wilson
*/

#include "GW.h"
#include "Assembly Macros.h"


Pstrcpy(to, from)
register char *from, *to;
{
	register int count;
	
	count = *to++ = *from++;
	while (--count >= 0)
		*to++ = *from++;
}


int getw(filenum)
int filenum;
{
	long count = 2;
	int theint;
	
	FSRead(filenum, &count, &theint);
	return(theint);
}


putw(theint, filenum)
int filenum, theint;
{
	long count = 2;
	
	FSWrite(filenum, &count, &theint);
}


macwrite(filenum, size, buffer)
int filenum, size;
char *buffer;
{
	long count = size;
	
	FSWrite(filenum, &count, buffer);
}


long macread(filenum, size, buffer)
int filenum, size;
char *buffer;
{
	long count = size;
	
	FSRead(filenum, &count, buffer);
	return(count);
}


int min(x, y)
int x, y;
{
	return(MIN(x,y));
}

int max(x, y)
int x, y;
{
	return(MAX(x,y));
}

int abs(x)
int x;
{
	return(ABS(x));
}




long pt2xy(thept, x, y)
Point *thept;
int x, y;
{
	long dx, dy;
	
	dx = thept->h - x;
	dy = thept->v - y;
	return(dx*dx + dy*dy);
}


long longmin(a, b)
long a, b;
{
	if (a<b)
		return(a);
	else
		return(b);
}


long pt2line(thept, line)
register Point *thept;
register linerec *line;
{
	int m2, h, g, x1, dist;
	extern int slopes2[];
	long dx, dy;
	
	if (thept->h < line->startx-50 ||
		thept->h > line->endx + 50 ||
		thept->v < min(line->starty, line->endy) - 50 ||
		thept->v > max(line->starty, line->endy) + 50	)
		return(10000);	/* help keep the arithmetic from overflowing */
		
	if (line->type == LINE_N)	/* special case for vertical lines */
	{
		if (thept->v < line->starty)
			return(pt2xy(thept, line->startx, line->starty)+10);
		else if (thept->v > line->endy)
			return(pt2xy(thept, line->endx, line->endy)+10);
		dx = thept->h - line->startx;
		return(dx*dx);
	}
	if (line->length == 0)
		return(pt2xy(thept, line->startx, line->starty));
	
	m2 = slopes2[line->type] * line->up_down;
	g = line->endx - line->startx;
	h = line->endy - line->starty;
	
	dx = (h * (long) ((m2*(line->startx - thept->h) / 2)
				- line->starty + thept->v))
			/ (g + ((long) h * m2 / 2));
	if (line->type == LINE_E)
		dy = thept->v - line->starty;
	else
		dy = (long) dx * -g / h;

	x1 = thept->h + dx;
	if (x1 < line->startx)
		return(pt2xy(thept, line->startx, line->starty) + 10);
	else if (x1 > line->endx)
		return(pt2xy(thept, line->endx, line->endy)+10);
	else
		return(dx*dx + dy*dy);
}
	


long find_waddr()
{
	asm
	{
		FIND_WADDRESS(D7, D6)
		move.l	A0, D0
	}
}

long find_baddr()
{
	asm
	{
		FIND_BADDRESS(D7, D6)
		move.l	A0, D0
	}
}


int rint(n)			/* returns an integer from 0 to n-1	*/
int n;
{
	asm
	{		subq.w	#2, SP
			_Random
			move.w	(SP)+, D0
			mulu	n(A6), D0
			swap	D0
	}					/* might want to speed this up by table of rands */
}


text_alert(message)
char *message;
{
	DialogPtr dptr;
	int itemhit, type;
	Handle item;
	Rect box;
	
	dptr = GetNewDialog(16, NULL, -1L);
	frame_default(dptr);
	GetDItem(dptr, 2, &type, &item, &box);
	SetIText(item, message);
	SysBeep(10);
	ModalDialog(NULL, &itemhit);
	DisposDialog(dptr);
}


int gen_dialog(dlognum)
int dlognum;
{
	DialogPtr dptr;
	DialogRecord drec;
	int itemhit;
	
	dptr = GetNewDialog(dlognum, &drec, -1L);
	frame_default(dptr);
	ModalDialog(NULL, &itemhit);
	CloseDialog(dptr);
	
	return(itemhit);
}


frame_default(dptr)
DialogPtr dptr;
{
	GrafPtr oldport;
	Handle item;
	int type;
	Rect box;
	
	GetPort(&oldport);
	SetPort(dptr);
	GetDItem(dptr, 1, &type, &item, &box);
	PenSize(3, 3);
	InsetRect(&box, -4, -4);
	FrameRoundRect(&box, 16, 16);
	SetPort(oldport);
}
	



int dlogvalue(dptr, item, low, high, correct)
DialogPtr dptr;
int item, low, high, *correct;	/* correct set false if ! low<=val<=high */
{
	char valstr[260];
	Handle itemh;
	Rect dummyrect;
	long value;
	
	GetDItem(dptr, item, &value, &itemh, &dummyrect);
	GetIText(itemh, valstr);
	StringToNum(valstr, &value);
	if (value < low)
	{
		value = low;
		SetDNum(dptr, item, low);
		*correct = FALSE;
	}
	else if (value > high)
	{
		value = high;
		SetDNum(dptr, item, high);
		*correct = FALSE;
	}
/*	if (value < low || value > high)
	{
		SelIText(dptr, item, 0, 20000);
		*correct = FALSE;
	}
*/	return(value);
}


SetDNum(dptr, item, value)
DialogPtr dptr;
int item, value;
{
	char thestr[10];
	Rect dummyr;
	int dummy;
	Handle itemh;
	
	NumToString((long) value, thestr);
	GetDItem(dptr, item, &dummy, &itemh, &dummyr);
	SetIText(itemh, thestr);
}



pascal int intfilter(dptr, evt, itemhit)
DialogPeek dptr;
register EventRecord *evt;
int *itemhit;
{
	char c;
	register TEPtr text;
	
	if (evt->what == keyDown)
	{
		c = (char ) evt->message;
		if (c == 13 || c == 3)			/* return or enter */
		{
			*itemhit = 1;
			return(-1);
		}
		if (c == 8)						/* backspace */
			;
		else if (c <= '9' && c >= '0')	/* digits */
		{
			text = *dptr->textH;
			if (text->selStart == text->selEnd && text->teLength >= 4)
				evt->what = nullEvent;
		}
		else
			evt->what = nullEvent;		/* all other keystrokes */
	}
	return(FALSE);
}



char horizstripes[8] ={255, 0, 255, 0, 255, 0, 255, 0};
char vertstripes[8] = {0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA};

map_planet(ingame)
int ingame;
{
	EventRecord eventbuf;
	GrafPtr oldport;
	WindowPtr mapwindow;
	WindowRecord wrecord;
	Rect maprect, shiprect, bunkrect, fromrect;
	BitMap bits;
	int hsize16, vsize16, border, xpos, ypos, timer;
	long dummylong, ww16, wh16;
	register int size16, hlen, offset, i;
	register linerec *line;
	register bunkrec *bp;
	fuelrec *fp;
	extern int worldwidth, worldheight, worldwrap, globalx, globaly,
				xstart, ystart;
	extern linerec lines[];
	extern bunkrec bunkers[];
	extern fuelrec fuels[];
/*	extern int map_bunk_defs[][8];	*/
	
	if (ingame)
	{
		hide_sound();
		normal_screen();
	}
	ww16 = (long) worldwidth << 4;
	wh16 = (long) worldheight << 4;
	hsize16 = ww16 / MAPWTH;
	vsize16 = wh16 / MAPHT;
	size16 = max(hsize16, vsize16) + 1;
	hlen = ww16/size16;					/* width in pixels of the map */
	border = (SCRWTH - hlen) / 2;
	
	GetPort(&oldport);
	SETRECT(maprect, border, 40+MAPBORDER, border + hlen,
				(int) ((40+MAPBORDER) + wh16/size16));
	mapwindow = NewWindow(&wrecord, &maprect, "\pPlanet Scan", TRUE,
						noGrowDocProc, -1L /* front */, FALSE, NULL);
	SetPort(mapwindow);
	
	if (worldwrap)
	{	offset = ((long) (worldwidth/2 - globalx) << 4) / size16;
		if (offset >= 0)
			offset -= hlen;		/* we'll make it positive later */
	}
	else
		offset = -hlen;
	
	for (; offset < hlen; offset += hlen)
		for (line=lines; line->startx < worldwidth; line++)
		{
			switch (line->kind) {
				case L_GHOST:	continue;
				case L_NORMAL:	PenPat(black);
								break;
				case L_BOUNCE:	if (line->type == LINE_N ||
											line->type == LINE_NNE)
									PenPat(horizstripes);
								else
									PenPat(vertstripes);
								break;
			}
			MoveTo((int) (((long) line->startx << 4) / size16) + offset,
					(int) (((long) line->starty << 4) / size16));
			LineTo((int) (((long) line->endx << 4) / size16) + offset,
					(int) (((long) line->endy << 4) / size16));
		}
	offset -= hlen;			/* set it back to normal after the shit */
	PenPat(black);
	
	ypos = ((long) (ingame ? globaly : ystart) << 4) / size16;
	xpos = ((long) (ingame ? globalx : xstart) << 4) / size16 + offset;
	if (xpos > hlen)
		xpos -= hlen;
	for (i=2; i<7; i+=2)
	{	SETRECT(shiprect, xpos-i, ypos-i, xpos+i, ypos+i);
		InvertOval(&shiprect);
	}
	
	for (bp = bunkers; bp->rot >= 0; bp++)
		if (bp->alive)
		{
			xpos = ((int)(((long) bp->x << 4) / size16) + offset) % hlen;
			ypos = ((long) bp->y << 4) / size16;
			SETRECT(bunkrect, xpos-2, ypos-2, xpos+2, ypos+2);
			InvertOval(&bunkrect);
/*			bits.rowBytes = 2;
			bits.baseAddr = (char *) map_bunk_defs[bp->rot];
			SETRECT(bits.bounds, 0, 0, 16, 8);
			SETRECT(fromrect, 8, 0, 15, 8);
			SETRECT(bunkrect, xpos-3, ypos-4, xpos+4, ypos+4);
			CopyBits(&bits, &mapwindow->portBits, &fromrect, &bunkrect,
						srcOr, NULL);
*/		}
	FlushEvents(everyEvent, 0);
	timer = 15;
	while(TRUE)
	{	
		Delay(1L, &dummylong);					/* wait 1/60 second */
		for (i = rint(NUMFUELS), fp=fuels; i>0 && fp->x < 10000; fp++, i--)
			;
		if (fp->alive && fp->x < 10000)
		{
			xpos = (((long) fp->x << 4) / size16 + offset) % hlen;
			ypos = ((long) fp->y << 4) / size16;
			SETRECT(bunkrect, xpos-1, ypos-1, xpos+2, ypos+2);
			InvertOval(&bunkrect);
		}
		if (!--timer) 
		{
/*			for (bp = bunkers; bp->rot >= 0; bp++)
				if (bp->alive)
				{
					xpos = ((int)(((long) bp->x << 4) / size16) + offset) % hlen;
					ypos = ((long) bp->y << 4) / size16;
					SETRECT(bunkrect, xpos-4, ypos-4, xpos+4, ypos+4);
					InvertOval(&bunkrect);
				}
*/			InvertOval(&shiprect);
			timer = 15;
		}
		SystemTask();
		if (GetNextEvent(mDownMask, &eventbuf) ||
			EventAvail(keyDownMask, &eventbuf)	)
			break;		/* keep key events, toss mousies */
	}
	SetPort(oldport);
	CloseWindow(mapwindow);
	if (ingame)
		show_sound();
}


TEHandle noteste;

show_notes()
{
	WindowPtr w, eventwind;
	ControlHandle ch, thecontrol;
	pascal void notesscroll();
	static Rect destrect = {3, 5, 227, 330},
				viewrect = {3, 0, 227, 335};
	Handle texth;
	EventRecord(eventbuf);
	int done = FALSE, part;
	
/* code to change the README file:	
	int f;
	long size;
	Handle h;
	
	h = GetResource('MISC', M_README);
	SetHandleSize(h, 10000L);
	FSOpen("\pReadMe", 0, &f);
	size = macread(f, 10000, *h);
	FSClose(f);
	SetHandleSize(h, size);
	ChangedResource(h);
	return;
*/	
	w = GetNewWindow(132, NULL, -1L);
	SetPort(w);
	ch = GetNewControl(131, w);
	noteste = TENew(&destrect, &viewrect);
	texth = GetResource('MISC', M_README);
	HLock(texth);
	TESetText(*texth, GetHandleSize(texth), noteste);
	ReleaseResource(texth);
	SetCtlMin(ch, 0);
	SetCtlMax(ch, (*noteste)->nLines - 14);
	
	while(!done)
	{
		GetNextEvent(everyEvent, &eventbuf);
		switch(eventbuf.what)
		{
		case mouseDown:
			switch(FindWindow(eventbuf.where, &eventwind))
			{
			case inContent:
				if (eventwind == w)
				{	GlobalToLocal(&eventbuf.where);
					if (part=FindControl(eventbuf.where, w, &thecontrol))
					{
						part = TrackControl(thecontrol, eventbuf.where, 
									part == inThumb ? NULL : notesscroll);
						if (part == inThumb)
							notesoffset(thecontrol);
						break;
					}
				}
			case inGoAway:
				if (eventwind == w)
					done = TrackGoAway(w, eventbuf.where);
				break;
			}
			break;
		case updateEvt:
			BeginUpdate(w);
			TEUpdate(&viewrect, noteste);
			DrawControls(w);
			EndUpdate(w);
			break;
		}
	}
	
	TEDispose(noteste);
	DisposeControl(ch);
	DisposeWindow(w);
}


pascal void notesscroll(thecontrol, partcode)
ControlHandle thecontrol;
int partcode;
{
	cnotesscroll(thecontrol, partcode);
}

cnotesscroll(thecontrol, partcode)
ControlHandle thecontrol;
int partcode;
{
	int oldpos, change;
	
	switch(partcode)
	{
		case inUpButton:	change = -1;
							break;
		case inDownButton:	change = 1;
							break;
		case inPageUp:		change = -13;
							break;
		case inPageDown:	change = 13;
							break;
		default:	return;
	}
	oldpos = GetCtlValue(thecontrol);
	SetCtlValue(thecontrol, oldpos + change);
	change = GetCtlValue(thecontrol) - oldpos;
	TEScroll(0, - change*(*noteste)->lineHeight, noteste);
						/* TEPinScroll easier, but not on Mac512 */
}

notesoffset(control)
ControlHandle control;
{
	TEScroll(0,
			 (-GetCtlValue(control) * (*noteste)->lineHeight) -
					(*noteste)->destRect.top,
			 noteste);
}



move_bytes(from, to, number)
register char *from, *to;
register int number;
{
	while (number--)
		*to++ = *from++;
}



int mystrcmp(s1, s2)
register char *s1, *s2;
{
	for (;*s1 && TOLOWER(*s1) == TOLOWER(*s2); s1++, s2++)
		;
	return(TOLOWER(*s1) - TOLOWER(*s2));
}



/* A fatal memory error has happened; quit gracefully */
memory_error()
{
	gen_dialog(27);
	ExitToShell();
}


