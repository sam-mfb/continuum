import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ShipState } from './types'
import { ShipControl } from './types'
import { SHIP } from './constants'

const initialState: ShipState = {
  shiprot: 0,
  fuel: 0,
  flaming: false,
  thrusting: false,
  firing: false,
  bouncing: false,
  refueling: false,
  shielding: false,
  dx: 0,
  dy: 0,
  cartooning: false,
  globalx: 0,
  globaly: 0,
  shipx: 0,
  shipy: 0,
  xslow: 0,
  yslow: 0
}

type ControlAction = {
  controlsPressed: ShipControl[]
  gravity: { x: number; y: number }
}

export const shipSlice = createSlice({
  name: 'ship',
  initialState,
  reducers: {
    shipControl: (state, action: PayloadAction<ControlAction>) => {
      const { controlsPressed, gravity } = action.payload
      const pressed = new Set(controlsPressed)
      // if (cartooning)
      // 	pressed = read_cartoon();
      // else
      // 	pressed = read_keyboard();

      if (pressed.has(ShipControl.LEFT))
        state.shiprot = (state.shiprot - 1) & 31
      if (pressed.has(ShipControl.RIGHT))
        state.shiprot = (state.shiprot + 1) & 31

      state.flaming = false
      if (pressed.has(ShipControl.THRUST) && state.fuel) {
        state.dx += (state.bouncing ? 1 : 2) * SHIP.thrustx[state.shiprot]!
        state.dy +=
          (state.bouncing ? 1 : 2) * SHIP.thrustx[(state.shiprot + 24) & 31]!
        /* if bouncing, make weaker to avoid flying through */
        // if (--flame_blink)
        // 	flaming = TRUE;
        // else
        // 	flame_blink = 4;
        state.thrusting = false
        // fuel_minus(FUELBURN);
        // start_sound(THRU_SOUND);
      } else state.thrusting = false

      state.dx -= (state.dx >> 6) + (state.dx > 0 ? 1 : 0) /* friction	*/
      state.dy -= (state.dy >> 6) + (state.dy > 0 && !state.cartooning ? 1 : 0)
      /* the cartoon was designed for an older, wrong friction model */

      if (!state.bouncing) {
        /* to keep from running through bouncing walls */
        // gravity_vector(globalx, globaly, &xgravity, &ygravity);
        state.dx += gravity.x
        state.dy += gravity.y /* GRAVITY !!!!!!!!!! */
      }

      //	if ( (pressed & KEY_SHIELD) && fuel)
      //	{	shielding = TRUE;
      //		start_sound(SHLD_SOUND);
      //		fuel_minus(FUELSHIELD);
      //		refueling = FALSE;
      //		for(fp=fuels; fp->x < 10000; fp++)
      //		{
      //			xdif = globalx - fp->x;
      //			ydif = globaly - fp->y;
      //			if (fp->alive && xyindist(xdif, ydif, FRADIUS))
      //			{
      //				fp->alive = FALSE;
      //				fp->currentfig = FUELFRAMES;
      //				fuel_minus(-FUELGAIN);	/* wow, a kludge! */
      //				score_plus(SCOREFUEL);
      //				start_sound(FUEL_SOUND);
      //			}
      //		}
      //	}
      //	else
      //		shielding = FALSE;
      //								/* check for fire */
      //	if(pressed & KEY_SHOOT)
      //	{	if(!firing)
      //		{	firing = TRUE;
      //			for(i=0,sp=shipshots; i<NUMBULLETS && sp->lifecount; i++,sp++)
      //				;
      //			if(i<NUMBULLETS && !shielding)
      //			{	int yrot = (shiprot + 24) & 31;
      //				sp->h = shotvecs[shiprot] + (dx >> 5);
      //				sp->v = shotvecs[yrot] + (dy >> 5);
      //				sp->x8 = (globalx << 3);
      //				sp->y8 = (globaly << 3);
      //				sp->lifecount = SHOTLEN;
      //				sp->btime = 0;
      //				set_life(sp, NULL);
      //				if (sp->lifecount > 0)
      //				{
      //					sp->x8 += shotvecs[shiprot];
      //					sp->y8 += shotvecs[yrot];
      //					sp->lifecount--;
      //				}
      //				if (sp->lifecount == 0)
      //					bounce_shot(sp);
      //				start_sound(FIRE_SOUND);
      //			}
      //		}
      //	}
      //	else
      //		firing = FALSE;
    },

    moveShip: state => {
      state.xslow += state.dx /* to slow down (and make smooth) */
      state.shipx += state.xslow >> 8
      state.xslow &= 255
      state.yslow += state.dy
      state.shipy += state.yslow >> 8
      state.yslow &= 255

      //contain_ship();
    }
  }
})

export default shipSlice.reducer

