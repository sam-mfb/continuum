/*
	Non-Assembly macros for GW
*/
 
extern void (*line_routines[]) (),
			(*white_routines[]) (),
			(*black_routines[]) ();

#define	DRAW_LINE_Q(x, y, len, thetype, u_d)		\
				(*line_routines[thetype]) ((x), (y) + SBARHT, (len), (u_d))

#define	BLACK_LINE_Q(line, scrx, scry)		\
				(*black_routines[line->newtype]) (line, scrx, scry)

#define	WHITE_LINE_Q(line, scrx, scry)		\
				(*white_routines[line->newtype]) (line, scrx, scry)

#define	DRAW_SHOT(sp)										\
		{if (sp->y >= screeny && sp->y < screenb-1)			\
			if (sp->lifecount == 0 && sp->strafedir >= 0)	\
				start_strafe(sp->x, sp->y, sp->strafedir);	\
			else if(sp->x >= screenx && sp->x < screenr-1)	\
				draw_dot_safe(sp->x - screenx, sp->y - screeny);	\
			else if(on_right_side && sp->x < screenr-worldwidth-1)	\
				draw_dot_safe(sp->x - screenx + worldwidth, sp->y - screeny);}


