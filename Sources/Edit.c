/*
	Gravity Well Planet Editor

	Copyright (c) 1986-88 Randall H. Wilson
*/ 


#include "GW.h"


extern pascal int intfilter();
extern linerec lines[NUMLINES];
extern bunkrec bunkers[NUMBUNKERS];
extern fuelrec fuels[NUMFUELS];
extern craterrec craters[];

extern int worldwidth, worldheight, worldwrap, shootslow;
extern int xstart, ystart;
extern int planetbonus, gravx, gravy, numcraters;

extern int slopes2[], ylength[], xlength[];

extern int screenx, screeny, screenr, screenb, on_right_side;

extern int wfile, worldsvol;
extern char worldsfilep[];
extern char indexes[150];
extern int currentlevel, planets, cartplanet;



int show_angles = FALSE,	/* option flags */
	rounding = TRUE,
	show_linetypes = TRUE,
	show_3D = TRUE,
	safe_lines = FALSE,
	changed,				/* true when current planet has been changed */
	selecttype, selectnum;	/* hold current selected object */

int pointertype, linekind, bunkkind,
	doubleclick;			/* true iff latest click was a double */
CursHandle modecursors[5];

MenuHandle planmenu, optsmenu;
WindowPtr editwin;
ControlHandle vertsbar, horizsbar;
Rect planrect, iconrect, moderect, kindrect, objrect;
RgnHandle origclip;

int scrollproc();




int planedit()
{
	WindowRecord winrec;
	WindowPeek wind;
	int next;
	
	planmenus();
	currentlevel = 1;
	get_planet(currentlevel);
	setupwindow(&winrec);
	pointertype = ARROWPTR;
	linekind = L_NORMAL;
	bunkkind = 0;
	start_planet();
	
	do
		next = EditPlanet();
	while (!check_and_save(currentlevel));
	write_header();
	
	DisposeRgn(origclip);
	KillControls(editwin);
	CloseWindow(editwin);
	while ( (wind = (WindowPeek) FrontWindow()) != NULL)
		CloseDeskAcc(wind->windowKind);
	unplanmenus();
	return(next);
}


write_header()
{
	SetFPos(wfile, fsFromStart, 0L);		/* save the indices */
	putw(-17, wfile);
	putw(planets, wfile);
	putw(cartplanet, wfile);
	SetFPos(wfile, fsFromStart, 10L);
	macwrite(wfile, sizeof(indexes), indexes);
	SetEOF(wfile, FILEHEAD + PLANSIZE * (long) planets);
	FlushVol(NULL, worldsvol);
}



planmenus()
{
	MenuHandle themenu;
	
	themenu = GetMHandle(FILEMENU);		/* allow "New" and "Play..." */
	SetItem(themenu, 4, "\pPlay Continuum");
	EnableItem(themenu, 1);
	DisableItem(themenu, 6);			/* can't clear hi scores */
	themenu = GetMHandle(EDITMENU);		/* enable the "edit" menu */
	EnableItem(themenu, 0);
	themenu = GetMHandle(GAMEMENU);		/* disable the "Game" menu */
	DisableItem(themenu, 0);
	planmenu = GetMenu(PLANMENU); 
	InsertMenu(planmenu, 0);
	optsmenu = GetMenu(OPTSMENU);
	InsertMenu(optsmenu, 0);
	CheckItem(optsmenu, 1, rounding);
	CheckItem(optsmenu, 2, show_angles);
	CheckItem(optsmenu, 3, show_linetypes);
	CheckItem(optsmenu, 4, show_3D);
	CheckItem(optsmenu, 5, safe_lines);
	DrawMenuBar();
	
	modecursors[ERASEPTR] = GetCursor(128);
	modecursors[CRATERPTR] = GetCursor(129);
	modecursors[SHIPPTR] = GetCursor(130);
	modecursors[LINEPTR] = GetCursor(crossCursor);	/* load the cursors */
}

unplanmenus()
{
	MenuHandle themenu;
	
	themenu = GetMHandle(FILEMENU);		/* disallow "New" and "Edit..." */
	SetItem(themenu, 4, "\pPlanet Editor");
	DisableItem(themenu, 1);
	EnableItem(themenu, 6);				/* now can clear hi scores */
	themenu = GetMHandle(EDITMENU);		/* disable the "edit" menu */
	DisableItem(themenu, 0);
	themenu = GetMHandle(GAMEMENU);		/* disable the "Game" menu */
	EnableItem(themenu, 0);
	DeleteMenu(PLANMENU);				/* remove the menus */
	DeleteMenu(OPTSMENU);
	ReleaseResource(planmenu);
	ReleaseResource(optsmenu);
}	
	

setupwindow(storage)
WindowRecord *storage;
{
	editwin = GetNewWindow(129, storage, -1L);
	SetPort(editwin);
	vertsbar = GetNewControl(129, editwin);
	horizsbar = GetNewControl(130, editwin);
	
	SETRECT(iconrect, 0, 0, 32, 284);	/* set up drawing rectangles */
	SETRECT(moderect, 0, 0, 32, 128);
	SETRECT(objrect, 0, 130, 32, 210);
	SETRECT(kindrect, 0, 212, 32, 284);
	SETRECT(planrect, 32, 0, 492, 284);
	origclip = NewRgn();				/* get the original clip region */
	GetClip(origclip);
}


setsbars()
{
	SetCtlMax(vertsbar, worldheight - 284);
	SetCtlValue(vertsbar, screeny);
	if (worldwrap)
	{
		SetCtlMax(horizsbar, worldwidth);
		SetCtlMin(horizsbar, 0);
	}
	else
	{
		SetCtlMax(horizsbar, worldwidth - planrect.right);
		SetCtlMin(horizsbar, -32);
	}
	SetCtlValue(horizsbar, screenx);
	screenx = GetCtlValue(horizsbar);
}



EditPlanet()
{
	EventRecord eventbuf;
	WindowPtr eventwindow;
	ControlHandle thecontrol;
	Point mousepos;
	long lastclick = 0;
	int next, part, foreground=TRUE;
	char hilite, keymap[16];
	extern int Have_WNE;
	
	for (next = 0; !next; )
	{
		if (foreground && FrontWindow() == editwin)
		{
			GetMouse(&mousepos);
			GetKeys(keymap);
			if (PtInRect(mousepos, &planrect))
				if (0x04 & keymap[7])
					docursor(ERASEPTR);
				else
					docursor(pointertype);
			else
				InitCursor();
		}
		if (Have_WNE)
			WaitNextEvent(everyEvent, &eventbuf, 10L, NULL);
		else
		{
			SystemTask();
			GetNextEvent(everyEvent, &eventbuf);
		}
		switch(eventbuf.what)
		{
		case activateEvt:
			if (eventbuf.message == (long) editwin)
				{	
					hilite = (eventbuf.modifiers & activeFlag) ? 0 : 255;
					HiliteControl(vertsbar, hilite);
					HiliteControl(horizsbar, hilite);
				}
			break;
		case mouseDown:
			doubleclick = !doubleclick &&
							(eventbuf.when <= lastclick + GetDblTime());
			lastclick = eventbuf.when;
			switch(FindWindow(eventbuf.where, &eventwindow))
			{
			case inMenuBar:
				next = domenu(MenuSelect(eventbuf.where));
				break;
			case inSysWindow:
				SystemClick(&eventbuf, eventwindow);
				break;
			case inContent:
				SelectWindow(editwin);
				GlobalToLocal(&eventbuf.where);
				if (part=FindControl(eventbuf.where, editwin, &thecontrol))
				{
					part = TrackControl(thecontrol, eventbuf.where, 
								part == inThumb ? NULL : scrollproc);
					if (part == inThumb)
						offsetwindow();
				}
				else
					doclick(eventbuf.where);
				break;
			}
			break;
		case autoKey:
		case keyDown:
			next = domenu(MenuKey((char) eventbuf.message));
			break;
		case updateEvt:
			SetPort(editwin);
			BeginUpdate(editwin);
			DrawControls(editwin);
			drawicons();
			ClipRect(&planrect);
			drawcontent();
			SetClip(origclip);
			EndUpdate(editwin);
			break;
		case app4Evt:
			if (eventbuf.message >> 24 == 0x01)
				foreground = eventbuf.message & 0x01;
			hilite = (foreground ? 0 : 255);
			HiliteControl(vertsbar, hilite);
			HiliteControl(horizsbar, hilite);
			InitCursor();
			break;
		}
	}
	return(next);
}


int domenu(menunum, itemnum)
int menunum, itemnum;		/* returns action next (0 if continue) */
{
	int next = 0, rotation;
	GrafPtr port;
	char accname[60], numstring[10];
	register int i, j;
	register bunkrec *bunk;
	extern int globalx;
	
	InitCursor();
	switch(menunum)
	{
	case APPLEMENU:
		switch(itemnum)
		{
			case 1:	gen_dialog(1);
					gen_dialog(10);
					break;
			
			case 2:	show_notes();
					break;
		
			default:GetItem(GetMHandle(APPLEMENU), itemnum, accname);
					GetPort(&port);
					OpenDeskAcc(accname);
					SetPort(port);
					break;
		}
		break;
	case FILEMENU:
		switch(itemnum)
		{
			case 1:	
					if (!disk_space(2*PLANSIZE))
						break;
					if (check_and_save(currentlevel))
						do_open(TRUE);
					break;
			case 2:	if (check_and_save(currentlevel))
					{
						do_open(FALSE);
						get_planet(currentlevel);
						start_planet();
					}
					break;
			case 4:	next = NEXTTITLE;
					break;
			case 8:	next = NEXTQUIT;
					break;
		}
		break;
	case EDITMENU:
		switch(itemnum)
		{
			case 3:
				copy_planet();
				clear_planet();
				break;
			case 4:
				copy_planet();
				break;
			case 5:
				if (planets >= 150)
				{
					text_alert(
					"\pA Galaxy cannot contain more than 150 planets");
					break;
				}
				if (!disk_space(PLANSIZE))
					break;
				paste_planet();
				break;
			case 7:
				if (gen_dialog(26) == 2)
					erase_planet();
				break;
		}
		break;
	case PLANMENU:
		switch(itemnum)
		{
			case 1:
				planet_globals();
				break;
			case 2:
				globalx = (screenx + 260) % worldwidth; /* ugly patch */
				map_planet(FALSE);		/* F because not in a game */
				break;
			case 4:
				next_planet(currentlevel + 1);
				break;
			case 5:
				next_planet(currentlevel - 1);
				break;
			case 6:
				next_planet(goto_planet());
				break;
			case 8:
				if (planets >= 150)
				{
					text_alert(
					"\pA Galaxy cannot contain more than 150 planets");
					break;
				}
				if (!disk_space(PLANSIZE))
					break;
				if (check_and_save(currentlevel))
					add_planet();
				break;
			case 9:
				if (gen_dialog(25) == 2)
				{
					get_planet(currentlevel);
					start_planet();
				}
				break;
			case 10:
				save_planet(currentlevel);
				changed = FALSE;
				break;
		}
		break;
	case OPTSMENU:
		InvalRect(&planrect);
		switch(itemnum)
		{
			case 1:
				rounding = !rounding;
				CheckItem(optsmenu, itemnum, rounding);
				break;
			case 2:
				show_angles = !show_angles;
				CheckItem(optsmenu, itemnum, show_angles);
				break;
			case 3:
				show_linetypes = !show_linetypes;
				CheckItem(optsmenu, itemnum, show_linetypes);
				break;
			case 4:
				show_3D = !show_3D;
				CheckItem(optsmenu, itemnum, show_3D);
				break;
			case 5:
				safe_lines = !safe_lines;
				CheckItem(optsmenu, itemnum, safe_lines);
				break;
			case 7:
			case 8:
				if (selecttype == BUNK_T)
				{
					bunk = bunkers + selectnum;
					if (bunk->kind >= BUNKROTKINDS)
						break;
					rotation = (itemnum == 7 ? 1 : 15);
					bunk->rot = (bunk->rot + rotation) & 15;
					rotation *= 32;
					for (i=0; i<2; i++)
					{
						bunk->ranges[i].high += rotation;
						if ((bunk->ranges[i].low += rotation) >= 512)
						{
							bunk->ranges[i].low -= 512;
							bunk->ranges[i].high -= 512;
						}
					}
					changed = TRUE;
				}
				break;
			case 9:
				if (selecttype == BUNK_T)
				{
					bunk = bunkers + selectnum;
					if (bunk->kind == GENERATORBUNK)
						set_attraction(bunk);
				}
				break;
		}
		break;
	}
	HiliteMenu(0);
	
	return(next);
}



int goto_planet()
{
	DialogRecord drec;
	DialogPtr dptr;
	int itemnum, retval, okay;
	
	dptr = GetNewDialog(6, &drec, -1L);
	frame_default(dptr);
	SelIText(dptr, 3, 0, 20);			/* select the number */
	do
	{
		do
			ModalDialog(intfilter, &itemnum);
		while(itemnum != 1 && itemnum != 2);
		okay = TRUE;
		retval = (itemnum == 2 ? currentlevel :
								 dlogvalue(dptr, 3, 1, planets, &okay));
		if (!okay)
			SysBeep(10);
	} while (!okay);
	CloseDialog(dptr);
	return(retval);
}


int disk_space(numbytes)
int numbytes;
{
	int errno;
	long currentsize = FILEHEAD + PLANSIZE * (long) planets;
	
	errno = SetEOF(wfile, currentsize + numbytes);
	if (errno != noErr)
	{
		text_alert(errno == dskFulErr ?
					"\pOperation failed:  Disk Full Error" :
					"\pOperation failed:  Disk Error");
		SetEOF(wfile, currentsize);
		return(FALSE);
	}
	else
		return(TRUE);
}


next_planet(newnum)
int newnum;
{
	if (newnum < 1 || newnum > planets || newnum == currentlevel)
		return;
	
	if (check_and_save(currentlevel))
	{
		currentlevel = newnum;
		get_planet(currentlevel);
		start_planet();
	}
}


start_planet()
{
	static char str[100], pnum[10];
	extern int globalx;
	
	screenx = xstart - SCRWTH / 2;
	screeny = ystart - (TOPMARG + BOTMARG) / 2;
	if (screenx < 0)
		screenx = 0;
	else
		screenx = min(screenx, worldwidth - planrect.right);
	if (screeny < 0)
		screeny = 0;
	else
		screeny = min(screeny, worldheight - planrect.bottom);

	calcextras();
	SetPort(editwin);
	InvalRect(&planrect);
	setsbars();
	
	Pstrcpy(str, worldsfilep);
	PtoCstr(str);
	strcat(str, " -- Planet ");
	NumToString((long) currentlevel, pnum);
	ParamText(NULL, pnum, NULL, NULL);
	PtoCstr(pnum);
	strcat(str, pnum);
	
	CtoPstr(str);
	SetWTitle(editwin, str);
	changed = FALSE;
	selecttype = NONE_T;
	globalx = (screenx + 260) % worldwidth; /* really disgusting patch */
	map_planet(FALSE);
}


check_and_save(planetnum)
int planetnum;
{
	char numstring[10];
	
	if (!changed)
		return(TRUE);
	
	switch(gen_dialog(24))
	{
		case 1:
				save_planet(planetnum);	/* pressed "Yes" */
		case 2:
				return(TRUE);			/* pressed "No" */
		case 3:
				return(FALSE);			/* pressed "Cancel" */
	}
}


save_planet(planetnum)
int planetnum;
{
	Handle planh;
	long offset, cureof;
	
	if (!changed)
		return;
	
	planh = NewHandle(PLANSIZE);
	HLock(planh);
	pack_planet(planh);
	
	offset = FILEHEAD + PLANSIZE * (long) indexes[planetnum - 1];
	GetEOF(wfile, &cureof);
	if (cureof < offset)
		SetEOF(wfile, offset);
	SetFPos(wfile, fsFromStart, offset);
	macwrite(wfile, PLANSIZE, *planh);
	DisposHandle(planh);
	write_header();			/* save info, flush volume */
}


/* Pack_Planet:  puts the info describing a planet into the 1900-byte
		handle passed to it.
*/
pack_planet(h)
Handle h;
{
	register int *ip, j;
	register linerec *line;
	bunkrec *bunk;
	fuelrec *fuel;
	
	ip = (int *) *h;
	
	*ip++ = worldwidth;
	*ip++ = worldheight;
	*ip++ = worldwrap;
	*ip++ = shootslow;
	*ip++ = xstart;
	*ip++ = ystart;
	*ip++ = planetbonus;
	*ip++ = gravx;
	*ip++ = gravy;
	*ip++ = numcraters;
	
	ip = (int *) (*h + PLANHEAD);
		
	for (line=lines; line < lines+NUMLINES; line++)
	{	*ip++ = line->startx;
		*ip++ = line->starty;
		*ip++ = line->length;
		*ip++ = ((int) line->up_down << 8) +
				(line->kind << 3) +
				line->type;
	}
	for (bunk = bunkers; bunk < bunkers+NUMBUNKERS; bunk++)
	{
		*ip++ = bunk->x;
		*ip++ = bunk->y;
		*ip++ = (bunk->rot == -1 ? -1 : bunk->rot + (bunk->kind << 8));
		for (j=0; j < 4; j++)
			*ip++ = ((int *) bunk->ranges) [j];
	}
	for (fuel = fuels; fuel < fuels + NUMFUELS; fuel++)
	{
		*ip++ = fuel->x;
		*ip++ = fuel->y;
	}
	move_bytes(craters, ip, sizeof(craterrec)*NUMPRECRATS);
}	


/*	The old version; the new one above should be cleaner
save_planet(plan)
int plan;
{
	register linerec *line;
	bunkrec *bunk;
	fuelrec *fuel;
	long offset, cureof;
	int f;
	extern char planetscrapfile[];
	
	if (plan >= 0)
	{
		if (!changed)
			return;
		offset = FILEHEAD + PLANSIZE * (long) indexes[plan-1];
		f = wfile;
	}
	else
	{
		offset = 0;
		FSOpen(planetscrapfile, 0, &f);
	}
	GetEOF(f, &cureof);
	if (cureof < offset)
		SetEOF(f, offset);
	SetFPos(f, fsFromStart, offset);
	
	putw(worldwidth, f);
	putw(worldheight, f);
	putw(worldwrap, f);
	putw(shootslow, f);
	putw(xstart, f);
	putw(ystart, f);
	putw(planetbonus, f);
	putw(gravx, f);
	putw(gravy, f);
	putw(numcraters, f);
	
	offset += PLANHEAD;
	GetEOF(f, &cureof);
	if (cureof < offset)
		SetEOF(f, offset);
	SetFPos(f, fsFromStart, offset);
	
	for (line=lines; line < lines+NUMLINES; line++)
	{	putw(line->startx, f);
		putw(line->starty, f);
		putw(line->length, f);
		putw(((int) line->up_down << 8) + (line->kind << 3) + line->type, f);
	}
	for (bunk = bunkers; bunk < bunkers+NUMBUNKERS; bunk++)
	{
		macwrite(f, sizeof(int) * 2, bunk);
		putw(bunk->rot == -1 ? -1 : bunk->rot + (bunk->kind << 8), f);
		macwrite(f, sizeof(rangerec) * 2, bunk->ranges);
	}
	for (fuel = fuels; fuel < fuels + NUMFUELS; fuel++)
		macwrite(f, sizeof(int)*2, fuel);
	macwrite(f, sizeof(craterrec)*NUMPRECRATS, craters);
	if (plan < 0)
		FSClose(f);
	else
		write_header();
}	*/


copy_planet()
{
	Handle scraph = GetResource('MISC', M_PLANETCLIP);
	
	pack_planet(scraph);
	ChangedResource(scraph);
}

clear_planet()
{
	register int i;
	
	if (cartplanet == currentlevel)
		cartplanet = 0;
	else if (cartplanet > currentlevel)
		cartplanet--;
	for (i=0; i < planets; i++)		/* find planet stored last */
		if (indexes[i] == planets-1)
			break;
	get_planet(i+1);
	indexes[i] = indexes[currentlevel-1];
	changed = TRUE;
	save_planet(i+1);
	for (i=currentlevel-1; i < planets; i++)
		indexes[i] = indexes[i+1];
	if (--planets < 1)
		add_planet();
	else
	{
		if (currentlevel > planets)
			--currentlevel;
		get_planet(currentlevel);
		start_planet();
	}
	write_header();
}

paste_planet()
{
	register int i;
	
	if (!check_and_save(currentlevel))
		return;
	if (cartplanet >= currentlevel)
		cartplanet++;
	planets++;
	for (i=planets-1; i >= currentlevel; i--)
		indexes[i] = indexes[i-1];
	indexes[currentlevel-1] = planets-1;
	unpack_planet(GetResource('MISC', M_PLANETCLIP));
	changed = TRUE;
	save_planet(currentlevel);
	start_planet();
}


erase_planet()
{
	xstart = 250;
	ystart = 170;
	lines[0].type = 0;
	lines[0].startx = 10000;
	bunkers[0].rot = -1;
	bunkers[0].x = 10000;
	fuels[0].x = 20000;
	numcraters = 0;
	
	changed = TRUE;
	InvalRect(&planrect);
}


add_planet()
{
	currentlevel = ++planets;
	indexes[currentlevel-1] = planets-1;
	
	worldwidth = 2000;
	worldheight = 1000;
	worldwrap = FALSE;
	shootslow = 12;
	planetbonus = 1000;
	gravx = 0;
	gravy = 20;
	
	erase_planet();
	
	save_planet(currentlevel);
	start_planet();
}


offsetwindow()
{
	screenx = GetCtlValue(horizsbar);
	screeny = GetCtlValue(vertsbar);
	
	InvalRect(&planrect);
	calcextras();
}

calcextras()
{
	screenr = screenx + EDWINWTH;
	screenb = screeny + EDWINHT;
	on_right_side = screenr > worldwidth;
}



doclick(startpt)
Point startpt;
{
	long now;
	char keymap[16];
	
	GetKeys(keymap);
	
	if (PtInRect(startpt, &moderect))
	{
		selectmode(pointertype);	/* de-select current mode */
		pointertype = startpt.v / 32;
		if (pointertype > SHIPPTR)
			pointertype = SHIPPTR;
		selectmode(pointertype);
		if (selecttype != NONE_T)	/* remove selection */
		{
			selecttype = NONE_T;
			InvalRect(&planrect);
		}
	}
	else if (PtInRect(startpt, &kindrect))
	{
		selectmode(pointertype);
		linekind = (startpt.v - kindrect.top) / 24;
		pointertype = LINEPTR;
		if (linekind > L_GHOST)
			linekind = L_GHOST;
		selectmode(pointertype);
	}
	else if (PtInRect(startpt, &planrect))
		if ((0x04 & keymap[7]) || pointertype == ERASEPTR)
		{
			now = TickCount() + 30;
			erasestuff(startpt, TRUE);
			while (StillDown())
			{
				BeginUpdate(editwin);
				drawcontent();
				EndUpdate(editwin);
				if (StillDown() && TickCount() > now)
				{
					GetMouse(&startpt);
					erasestuff(startpt, FALSE);
				}
			}
		}
		else
			switch(pointertype)
			{
				case ARROWPTR:
					arrowstuff(startpt);
					break;
				case CRATERPTR:
					craterstuff(startpt);
					break;
				case SHIPPTR:
					shipptrstuff(startpt);
					break;
				case LINEPTR:
					linestuff(startpt);
					break;
			}
	else if (PtInRect(startpt, &iconrect))
		newobject(startpt);
}


Rect gravboxrect = {80, 10, 180, 110};

pascal void drawgbox(thewin, itemno)
WindowPtr thewin;
int itemno;
{
	int d, x, y, dx, dy;
	
	EraseRect(&gravboxrect);
	FrameRect(&gravboxrect);
	MoveTo(59, 130);
	Line(2, 0);
	MoveTo(60, 129);
	Line(0, 2);
	
	x = gravx / 3;
	y = gravy / 3;
	d = sqroot(x*x + y*y);
	if (d <= 0)
		return;
	MoveTo(60, 130);		/* draw the line */
	Line(x, y);
	dx = -3 * (x+y) / d;	/* draw arrowhead */
	dy = 3 * (x-y) / d;
	Line(dx, dy);
	Move(-dx, -dy);
	Line(-dy, dx);
}


int sqroot(n)
int n;
{
	int value, oddnum;
	
	for (value=-1, oddnum=1; n >= 0; value++, oddnum+=2)
		n -= oddnum;
	return(value);
}


planet_globals()
{
	DialogPtr dptr;
	Handle itemh;
	register int i;
	int done, item, dummy, dx, dy, minht, minwth;
	Rect dummyrect;
	Point hitpt;
	
	dptr = GetNewDialog(7, NULL, -1L);
	SetDItem(dptr, 2, userItem, drawgbox, &gravboxrect);
	ShowWindow(dptr);
	SetPort(dptr);
	frame_default(dptr);
	SetDNum(dptr, 4, worldwidth);
	SetDNum(dptr, 5, worldheight);
	SetDNum(dptr, 6, shootslow);
	SetDNum(dptr, 7, planetbonus);
	done = FALSE;
	while (!done)
	{
		SetItemValue(dptr, 3, worldwrap);
		ModalDialog(intfilter, &item);
		
		switch (item)
		{
		case 1:
			done = TRUE;
			planetbonus = dlogvalue(dptr, 7, 0, 30000, &done);
			shootslow = dlogvalue(dptr, 6, 0, 100, &done);
			getmindims(&minwth, &minht);
			worldheight = dlogvalue(dptr, 5, minht, 4000, &done);
			worldwidth = dlogvalue(dptr, 4, minwth, 4000, &done);
			if (worldwidth < minwth && worldwidth >= 600)
				text_alert("\pA Planet width that low would place objects outside the planet.");
			else if (worldheight < minht && worldheight >= 400)
				text_alert("\pA Planet height that low would place objects outside the planet.");
			else if (worldwidth & 1)
			{
				text_alert("\pThe width must be even.");
				done = FALSE;
			}
			else if (!done)
				SysBeep(10);
			break;
		case 2:
			GetMouse(&hitpt);
			dx = hitpt.h - 60;
			dy = hitpt.v - 130;
			gravx = dx * 3;
			gravy = dy * 3;
			InvalRect(&gravboxrect);
			break;
		case 3:
			worldwrap = !worldwrap;
			break;
		}
	}
	SetPort(editwin);
	DisposDialog(dptr);
	changed = TRUE;
	InvalRect(&planrect);
	setsbars();
}


getmindims(wth, ht)
register int *wth, *ht;
{
	register linerec *line;
	register bunkrec *bunk;
	register craterrec *crat;
	fuelrec *fuel;
	
	*wth = 600;
	*ht = 400;
	for (line=lines; line->type; line++)
	{
		get1min(wth, ht, line->startx, line->starty);
		get1min(wth, ht, line->endx, line->endy);
	}
	for (bunk=bunkers; bunk->rot >= 0; bunk++)
		get1min(wth, ht, bunk->x + 10, bunk->y + 10);
	for (crat=craters; crat < craters + numcraters; crat++)
		get1min(wth, ht, crat->x + 10, crat->y + 10);
	for (fuel=fuels; fuel->x < 10000; fuel++)
		get1min(wth, ht, fuel->x + 10, fuel->y + 10);
	get1min(wth, ht, xstart, ystart);
}

get1min(wth, ht, xval, yval)
int *wth, *ht, xval, yval;
{
	if (xval < 4000 && xval > *wth)
		*wth = xval;
	if (yval < 4000 && yval > *ht)
		*ht = yval;
}



SetItemValue(dptr, item, value)
DialogPtr dptr;
int item, value;
{
	Rect dummyr;
	int dummy;
	Handle itemh;
	
	GetDItem(dptr, item, &dummy, &itemh, &dummyr);
	SetCtlValue(itemh, value);
}

int GetItemValue(dptr, item)
DialogPtr dptr;
int item;
{
	Rect dummyr;
	int dummy;
	Handle itemh;
	
	GetDItem(dptr, item, &dummy, &itemh, &dummyr);
	return(GetCtlValue(itemh));
}

