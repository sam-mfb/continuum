# Assembly Macro Usage in Original Code

This document tracks where each assembly macro from `orig/Sources/Assembly Macros.h` is used in the original Continuum source code.

## NEGIFNEG

Conditional negation macro that negates a value if another value is negative.

**Usage in original code:**
- `orig/Sources/Draw.c:1012` - in `draw_nneline()` function, negates D2 if dir(A6) is negative
- `orig/Sources/Draw.c:1266` - in `draw_eneline()` function, negates D1 if dir(A6) is negative

## FIND_WADDRESS

Macro that calculates word-aligned screen addresses from x,y coordinates.

**Usage in original code:**
- `orig/Sources/Junctions.c:747` - in `white_wall_piece()` function
- `orig/Sources/Junctions.c:802` - in `eor_wall_piece()` function
- `orig/Sources/Junctions.c:883` - in `fast_hashes()` function
- `orig/Sources/Junctions.c:945` - in `draw_hash()` function
- `orig/Sources/Draw.c:568` - in `draw_dot()` function (commented out)
- `orig/Sources/Draw.c:586` - in `draw_dot_safe()` function
- `orig/Sources/Draw.c:607` - in `draw_spark_safe()` function
- `orig/Sources/Draw.c:632` - in `draw_shipshot()` function
- `orig/Sources/Walls.c:279` - in `draw_nwline()` function
- `orig/Sources/Walls.c:842` - in `eseline()` function
- `orig/Sources/Walls.c:925` - in `draw_seline()` function
- `orig/Sources/Walls.c:1049` - in `draw_sseline()` function
- `orig/Sources/Utils.c:224` - in `find_waddr()` function

## FIND_BADDRESS

Macro that calculates byte-aligned screen addresses from x,y coordinates.

**Usage in original code:**
- `orig/Sources/Draw.c:512` - in `draw_small()` function
- `orig/Sources/Draw.c:539` - in `black_small()` function
- `orig/Sources/Utils.c:232` - in `find_baddr()` function

## JSR_WADDRESS

Jump to subroutine wrapper that calls find_waddr and moves result to A0.

**Usage in original code:**
- `orig/Sources/Draw.c:41` - in `draw_figure()` function
- `orig/Sources/Draw.c:76` - in `erase_figure()` function
- `orig/Sources/Draw.c:112` - in `full_figure()` function
- `orig/Sources/Draw.c:162` - in `gray_figure()` function
- `orig/Sources/Draw.c:200` - in `shift_figure()` function
- `orig/Sources/Draw.c:244` - in `check_figure()` function
- `orig/Sources/Draw.c:298` - in `draw_medium()` function (commented out version)
- `orig/Sources/Draw.c:365` - in `draw_medium()` function
- `orig/Sources/Draw.c:421` - in `draw_medsm()` function
- `orig/Sources/Draw.c:449` - in `draw_shard()` function
- `orig/Sources/Draw.c:737` - in `draw_bunker()` function
- `orig/Sources/Draw.c:849` - in `full_bunker()` function
- `orig/Sources/Draw.c:963` - in `draw_nline()` function
- `orig/Sources/Draw.c:1239` - in `draw_eneline()` function (first call)
- `orig/Sources/Draw.c:1259` - in `draw_eneline()` function (second call)
- `orig/Sources/Draw.c:1343` - in `draw_eline()` function
- `orig/Sources/Draw.c:1560` - in `clear_point()` function
- `orig/Sources/Walls.c:114` - in `nne_white()` function (first call)
- `orig/Sources/Walls.c:187` - in `nne_white()` function (second call)
- `orig/Sources/Walls.c:320` - in `ne_black()` function
- `orig/Sources/Walls.c:409` - in `ene_black()` function
- `orig/Sources/Walls.c:533` - in `ene_white()` function
- `orig/Sources/Walls.c:615` - in `east_black()` function
- `orig/Sources/Walls.c:789` - in `ese_black()` function
- `orig/Sources/Walls.c:1125` - in `sse_black()` function
- `orig/Sources/Walls.c:1196` - in `south_black()` function

## JSR_BADDRESS

Jump to subroutine wrapper that calls find_baddr and moves result to A0.

**Usage in original code:**
- `orig/Sources/Draw.c:1006` - in `draw_nneline()` function
- `orig/Sources/Draw.c:1145` - in `draw_neline()` function
