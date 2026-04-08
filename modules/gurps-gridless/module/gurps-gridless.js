const MODULE_ID = 'gurps-gridless';

const defaultColors = {
  lineAlpha: 1.0,
  fillAlpha: 0.2,
  lineColor: 0x000000,
  frontColor: 0x00ff00,
  sideColor: 0xffff00,
  backColor: 0xff0000,
  borderAlpha: 1.0,
  indicatorAlpha: 1.0,
  indicatorFillColor: '#000000',
  indicatorLineColor: '#ffffff',
};

const faceAngels = {
  frontStart: 0,
  forward: Math.PI / 2,
  frontEnd: Math.PI,
  rightEnd: Math.PI + Math.PI / 3,
  backward: Math.PI + Math.PI / 2,
  backEnd: Math.PI + (Math.PI / 3) * 2,
  leftEnd: 2 * Math.PI,
};

function isHexRowGrid() {
  return canvas.grid.type === CONST.GRID_TYPES.HEXODDR || canvas.grid.type === CONST.GRID_TYPES.HEXEVENR;
}

function isHexColumnGrid() {
  return canvas.grid.type === CONST.GRID_TYPES.HEXODDQ || canvas.grid.type === CONST.GRID_TYPES.HEXEVENQ;
}

function isHexGrid() {
  return isHexRowGrid() || isHexColumnGrid();
}

function scalingsDim(width, length, fit) {
  const dim =
    fit === 'contain'
      ? width < length
        ? 'width'
        : 'height'
      : fit === 'cover'
      ? width > length
        ? 'width'
        : 'height'
      : fit === 'fill'
      ? width < length
        ? 'width'
        : 'height'
      : fit;
  return dim;
}

/*
    scale for the image from 1 hex to the real dimension
*/
function calcTokenHexScale(width, length, scaling, fit) {
  const l = fit === 'height' ? Math.round(length) : Math.round(width);
  return scaling * l;
}

/*
    factor (distance of an edge center to the hex center) / (distance of a corner to the hex center)
    note: the distance of a corner to the hex center is the same as an edge length
*/
const edgeFactor = Math.sqrt(3) / 2;

/*
    distance of hex centers orthogonal to the main hex direction in grid units as measured in the main hex direction
    hexes is the distance in hexes
    The factor 0.75 is because the hex rows/columns overlap by 25%
*/
function hexCenterToHexCenterOnMinorAxis(hexes) {
  return (hexes * 0.75) / edgeFactor;
}

/*
    width of the bounding box orthogonal to the main hex direction in grid units as measured in the main hex direction.
    the additional + 0.25 to the previous formula is because the bounding box included the overlapping part on both edges.
*/
const hexBoundingBoxOnMinorAxis = 1 / edgeFactor;

/*
  Because on hex rows the token length is orthogonal to the hex main axis in token space, we have to correct for the boxFitting on hexRows
*/
function rowScaleCorrection() {
  if (isHexRowGrid()) {
    return edgeFactor;
  } else {
    return 1;
  }
}

function imageScaleCorrection(fit) {
  if ((isHexRowGrid() && fit === 'width') || (isHexColumnGrid() && fit === 'height')) {
    return 1 / edgeFactor;
  } else {
    return 1;
  }
}

function calcOffsetFromFront(length, scale, hOffset) {
  return 0.5 + (0.5 - hOffset / length) / scale;
}

function calcOffsetFromCenter(length, scale, hOffset) {
  return 0.5 + hOffset / length / scale;
}

/*
    Offset the token so that the middle front hex is on the center of rotation.
    We have to take the scale into account, because foundry will scale from the offset and we need to correct for that.
*/
function calcTokenHexOffset(length, scaling, offsetY, offsetX, imageOffsetY, imageOffsetX, lookedRotation) {
  const roundedLength = Math.round(length);
  const roundedOffsetY = Math.round(offsetY ?? 0);
  const roundedOffsetX = Math.round(offsetX ?? 0);
  //set the rotation center a half hex from the front (if the explicit offset is 0)
  const hOffset = -roundedLength * 0.5 + 1 - roundedOffsetY;

  //Because the width is orthogonal to the hex main axis, we have to correct both the bounding box and the distance
  const wDim = hexBoundingBoxOnMinorAxis;
  const wOffset = hexCenterToHexCenterOnMinorAxis(roundedOffsetX);

  return {
    x: calcOffsetFromCenter(wDim, rowScaleCorrection(), wOffset),
    y: calcOffsetFromFront(1, 1 / rowScaleCorrection(), hOffset),
    ix: lookedRotation
      ? calcOffsetFromCenter(wDim, scaling, imageOffsetX * (3 / 2))
      : calcOffsetFromCenter(wDim, scaling, wOffset + imageOffsetX * (3 / 2)),
    iy: lookedRotation
      ? calcOffsetFromCenter(1, scaling, imageOffsetY)
      : calcOffsetFromFront(1, scaling, hOffset + imageOffsetY),
  };
}

function calcTokenOffset(width, length, scaling, offsetY, offsetX, imageOffsetY, imageOffsetX, lookedRotation) {
  const hOffset = Math.min(0.5, length / 2) - (offsetY ?? 0);
  return {
    x: calcOffsetFromCenter(width, 1, offsetX ?? 0),
    y: calcOffsetFromFront(length, 1, hOffset),
    ix: lookedRotation
      ? calcOffsetFromCenter(width, scaling, imageOffsetX)
      : calcOffsetFromCenter(width, scaling, (offsetX ?? 0) + imageOffsetX),
    iy: lookedRotation
      ? calcOffsetFromCenter(length, scaling, imageOffsetY)
      : calcOffsetFromFront(length, scaling, hOffset + imageOffsetY),
  };
}

function makeTokenUpdates(
  width,
  length,
  scaling,
  fit,
  tokenDocument,
  offsetY,
  offsetX,
  imageOffsetY,
  imageOffsetX,
  oldWidth,
  oldLength,
  oldX,
  oldY,
) {
  let changes = {};
  let offset;
  if (isHexGrid()) {
    const hexScaling = calcTokenHexScale(width, length, scaling, fit);
    offset = calcTokenHexOffset(
      length,
      hexScaling,
      offsetY,
      offsetX,
      imageOffsetY,
      imageOffsetX,
      tokenDocument.lockRotation,
    );

    changes = {
      height: 1,
      width: 1,
      texture: {
        scaleX: hexScaling * imageScaleCorrection(fit),
        scaleY: hexScaling * imageScaleCorrection(fit),
        anchorY: offset.iy,
        anchorX: offset.ix,
      },
    };
  } else {
    offset = calcTokenOffset(
      width,
      length,
      scaling,
      offsetY,
      offsetX,
      imageOffsetY,
      imageOffsetX,
      tokenDocument.lockRotation,
    );

    changes = {
      height: length,
      width: width,
      texture: {
        scaleX: scaling,
        scaleY: scaling,
        anchorY: offset.iy,
        anchorX: offset.ix,
      },
    };
    if (oldWidth && oldWidth !== width) {
      changes.x = Math.round(oldX - (width - oldWidth) * canvas.grid.sizeX * 0.5);
    }
    if (oldLength && oldLength !== length) {
      changes.y = Math.round(oldY - (length - oldLength) * canvas.grid.sizeY * 0.5);
    }
  }

  tokenDocument.gurpsGridless = foundry.utils.mergeObject(tokenDocument.gurpsGridless ?? {}, {
    anchorX: offset.x,
    anchorY: offset.y,
  });

  return changes;
}

function setTokenDimensions$1(tokenDocument) {
  if (!game.settings.get(MODULE_ID, 'GURPSMovementEnabled')) return;
  if (!tokenDocument.isOwner) return;

  let flags = {};
  flags[MODULE_ID] = {};
  if ((tokenDocument.flags?.[MODULE_ID]?.tokenWidth ?? 0) < 0.2) {
    flags[MODULE_ID].tokenWidth = 1;
  }
  if ((tokenDocument.flags?.[MODULE_ID]?.tokenLength ?? 0) < 0.2) {
    flags[MODULE_ID].tokenLength = 1;
  }
  if ((tokenDocument.flags?.[MODULE_ID]?.tokenScaling ?? 0) < 0.1) {
    flags[MODULE_ID].tokenScaling = 1;
  }

  const width = Math.max(tokenDocument.flags[MODULE_ID]?.tokenWidth ?? tokenDocument.width, 0.2);
  const length = Math.max(tokenDocument.flags[MODULE_ID]?.tokenLength ?? tokenDocument.height, 0.2);
  const scaling = Math.max(tokenDocument.flags[MODULE_ID]?.tokenScaling ?? tokenDocument?.texture?.scaleX ?? 1, 0.1);
  const offsetY = tokenDocument.flags[MODULE_ID]?.tokenOffsetY ?? 0;
  const offsetX = tokenDocument.flags[MODULE_ID]?.tokenOffsetX ?? 0;
  const imageOffsetY = tokenDocument.flags[MODULE_ID]?.tokenImageOffsetY ?? 0;
  const imageOffsetX = tokenDocument.flags[MODULE_ID]?.tokenImageOffsetX ?? 0;
  const fit = scalingsDim(width, length, tokenDocument.texture?.fit ?? 'height');

  const newChanges = makeTokenUpdates(
    width,
    length,
    scaling,
    fit,
    tokenDocument,
    offsetY,
    offsetX,
    imageOffsetY,
    imageOffsetX,
  );

  newChanges.flags = flags;

  tokenDocument.update(newChanges);
}

function setTokenDimensionsOnUpdate(tokenDocument, changes, options) {
  if (!game.settings.get(MODULE_ID, 'GURPSMovementEnabled')) return;

  if ((changes?.flags?.[MODULE_ID]?.tokenWidth ?? 1) < 0.2) {
    changes.flags[MODULE_ID].tokenWidth = 0.2;
  }
  if ((changes?.flags?.[MODULE_ID]?.tokenLength ?? 1) < 0.2) {
    changes.flags[MODULE_ID].tokenLength = 0.2;
  }
  if ((changes?.flags?.[MODULE_ID]?.tokenScaling ?? 1) < 0.1) {
    changes.flags[MODULE_ID].tokenScaling = 0.1;
  }

  const width = Math.max(
    changes?.flags?.[MODULE_ID]?.tokenWidth ?? tokenDocument.flags[MODULE_ID]?.tokenWidth ?? tokenDocument.width,
    0.2,
  );
  const length = Math.max(
    changes?.flags?.[MODULE_ID]?.tokenLength ?? tokenDocument.flags[MODULE_ID]?.tokenLength ?? tokenDocument.height,
    0.2,
  );
  const scaling = Math.max(
    changes?.flags?.[MODULE_ID]?.tokenScaling ??
      tokenDocument.flags[MODULE_ID]?.tokenScaling ??
      tokenDocument?.texture?.scaleX ??
      1,
    0.1,
  );
  const offsetY = changes?.flags?.[MODULE_ID]?.tokenOffsetY ?? tokenDocument.flags[MODULE_ID]?.tokenOffsetY ?? 0;
  const offsetX = changes?.flags?.[MODULE_ID]?.tokenOffsetX ?? tokenDocument.flags[MODULE_ID]?.tokenOffsetX ?? 0;
  const imageOffsetY =
    changes?.flags?.[MODULE_ID]?.tokenImageOffsetY ?? tokenDocument.flags[MODULE_ID]?.tokenImageOffsetY ?? 0;
  const imageOffsetX =
    changes?.flags?.[MODULE_ID]?.tokenImageOffsetX ?? tokenDocument.flags[MODULE_ID]?.tokenImageOffsetX ?? 0;
  const fit = scalingsDim(width, length, changes?.texture?.fit ?? tokenDocument.texture?.fit ?? 'height');

  const oldLength = tokenDocument.flags[MODULE_ID]?.tokenLength ?? tokenDocument.height;
  const oldWidth = tokenDocument.flags[MODULE_ID]?.tokenWidth ?? tokenDocument.width;
  const oldY = changes?.y ?? tokenDocument.y;
  const oldX = changes?.x ?? tokenDocument.x;

  const newChanges = makeTokenUpdates(
    width,
    length,
    scaling,
    fit,
    tokenDocument,
    offsetY,
    offsetX,
    imageOffsetY,
    imageOffsetX,
    oldWidth,
    oldLength,
    oldX,
    oldY,
  );

  foundry.utils.mergeObject(changes, newChanges);

  if (width !== oldWidth || length !== oldLength) {
    options.animate = false;
  }
}

function setTokenDimensionsOnCreate(tokenDocument, data) {
  if (!game.settings.get(MODULE_ID, 'GURPSMovementEnabled')) return;

  const width =
    (data.flags[MODULE_ID]?.tokenWidth ?? data.width ?? 1) < 0.1
      ? 1
      : data.flags[MODULE_ID]?.tokenWidth ?? data.width ?? 1;
  const length =
    (data.flags[MODULE_ID]?.tokenLength ?? data.height ?? 1) < 0.1
      ? 1
      : data.flags[MODULE_ID]?.tokenLength ?? data.height ?? 1;
  const scaling =
    (data.flags[MODULE_ID]?.tokenScaling ?? data.texture?.scaleX ?? 1) < 0.1
      ? 1
      : data.flags[MODULE_ID]?.tokenScaling ?? data.texture?.scaleX ?? 1;
  const offsetY = data.flags[MODULE_ID]?.tokenOffsetY ?? 0;
  const offsetX = data.flags[MODULE_ID]?.tokenOffsetX ?? 0;
  const imageOffsetY = data.flags[MODULE_ID]?.tokenImageOffsetY ?? 0;
  const imageOffsetX = data.flags[MODULE_ID]?.tokenImageOffsetX ?? 0;
  const fit = scalingsDim(width, length, data.texture?.fit ?? 'height');
  const origOffsetX = data.texture?.offset?.x ?? 0.5;
  const origOffsetY = data.texture?.offset?.y ?? 0.5;

  const flags = {};
  flags[MODULE_ID] = {
    tokenWidth: width,
    tokenLength: length,
    tokenScaling: scaling,
    tokenOffsetY: 0,
    tokenOrigOffsetX: origOffsetX,
    tokenOrigOffsetY: origOffsetY,
    tokenImageOffsetY: imageOffsetY,
    tokenImageOffsetX: imageOffsetX,
  };

  const newData = makeTokenUpdates(
    width,
    length,
    scaling,
    fit,
    tokenDocument,
    offsetY,
    offsetX,
    imageOffsetY,
    imageOffsetX,
  );

  newData.flags = flags;

  tokenDocument.updateSource(newData);
}

function setTokenDimensionsOnEnable(tokenDocument) {
  const width = tokenDocument.width ?? 1;
  const length = tokenDocument.height ?? 1;
  const scaling = tokenDocument.texture?.scaleX ?? 1;
  const offsetY = tokenDocument.flags[MODULE_ID]?.tokenOffsetY ?? 0;
  const offsetX = tokenDocument.flags[MODULE_ID]?.tokenOffsetX ?? 0;
  const imageOffsetY = tokenDocument.flags[MODULE_ID]?.tokenImageOffsetY ?? 0;
  const imageOffsetX = tokenDocument.flags[MODULE_ID]?.tokenImageOffsetX ?? 0;
  const fit = scalingsDim(width, length, tokenDocument.texture?.fit ?? 'height');
  const origOffsetX = tokenDocument.texture?.offset?.x ?? 0.5;
  const origOffsetY = tokenDocument.texture?.offset?.y ?? 0.5;

  const flags = {};
  flags[MODULE_ID] = {
    tokenWidth: width,
    tokenLength: length,
    tokenScaling: scaling,
    tokenOffsetY: 0,
    tokenOrigOffsetX: origOffsetX,
    tokenOrigOffsetY: origOffsetY,
    tokenImageOffsetY: imageOffsetY,
    tokenImageOffsetX: imageOffsetX,
  };

  const changes = makeTokenUpdates(
    width,
    length,
    scaling,
    fit,
    tokenDocument,
    offsetY,
    offsetX,
    imageOffsetY,
    imageOffsetX,
  );

  changes.flags = flags;

  tokenDocument.update(changes);
}

function resetTokenDimensionsOnDisable(tokenDocument) {
  const width = tokenDocument.flags[MODULE_ID]?.tokenWidth ?? tokenDocument.width ?? 1;
  const length = tokenDocument.flags[MODULE_ID]?.tokenLength ?? tokenDocument.height ?? 1;
  const scaling = tokenDocument.flags[MODULE_ID]?.tokenScaling ?? tokenDocument.texture?.scaleX ?? 1;
  const offsetY = tokenDocument.flags[MODULE_ID]?.tokenOrigOffsetY ?? tokenDocument.texture?.offset?.x ?? 0.5;
  const offsetX = tokenDocument.flags[MODULE_ID]?.tokenOrigOffsetX ?? tokenDocument.texture?.offset?.x ?? 0.5;

  let changes = {
    height: length,
    width: width,
    texture: {
      scaleX: scaling,
      scaleY: scaling,
      anchorX: offsetY,
      anchorY: offsetX,
    },
  };

  tokenDocument.update(changes);
}

function doHexLongBodyShape(width, height, f) {
  const w = (isHexRowGrid() ? canvas.grid.sizeY : canvas.grid.sizeX) / 2;
  const wHalf = w / 2;
  const h = (isHexRowGrid() ? canvas.grid.sizeX : canvas.grid.sizeY) / 2;
  let y = height;
  let posX = wHalf;
  let down = false;
  let face = 'FRONT';
  f(posX, h * y, face);
  while (y > -height) {
    if (y > height - Math.ceil((width + 1) / 2)) {
      if (down) {
        y = y - 1;
        posX = posX - wHalf;
      } else {
        posX = posX - w;
      }
    } else if (y > -height + Math.ceil((width + 1) / 2)) {
      face = 'SIDE';
      y = y - 1;
      if (down) {
        posX = posX - wHalf;
      } else {
        posX = posX + wHalf;
      }
    } else {
      face = down || height > 1 ? 'BACK' : 'SIDE';
      if (!down) {
        y = y - 1;
        posX = posX + wHalf;
      } else {
        posX = posX + w;
      }
    }
    down = !down;
    f(posX, h * y, face);
  }
  while (y < height) {
    if (y < -height + Math.ceil(width / 2)) {
      face = down || height > 1 ? 'BACK' : 'SIDE';
      if (!down) {
        y = y + 1;
        posX = posX + wHalf;
      } else {
        posX = posX + w;
      }
    } else if (y < height - Math.ceil(width / 2)) {
      face = 'SIDE';
      y = y + 1;
      if (down) {
        posX = posX - wHalf;
      } else {
        posX = posX + wHalf;
      }
    } else {
      face = 'FRONT';
      if (down) {
        y = y + 1;
        posX = posX - wHalf;
      } else {
        posX = posX - w;
      }
    }
    down = !down;
    f(posX, h * y, face);
  }
}

function doHexWideBodyShape(width, height, f) {
  const w = (isHexRowGrid() ? canvas.grid.sizeY : canvas.grid.sizeX) / 2;
  const wHalf = w / 2;
  const h = (isHexRowGrid() ? canvas.grid.sizeX : canvas.grid.sizeY) / 2;
  let x = 0;
  let posX = wHalf;
  let dir = 0;
  let y = height;
  let face = 'FRONT';
  f(posX, h * y, face);
  while (x > -Math.ceil(width / 2)) {
    y = y + dir;
    x = x - (y >= height ? 0 : 1);
    if (dir === 0) {
      posX = posX - w;
      dir = y === height ? -1 : 1;
    } else {
      posX = posX - wHalf;
      dir = 0;
    }
    f(posX, h * y, face);
  }
  face = 'SIDE';
  let out = dir === 0 ? -1 : 1;
  while (y > -height + 1) {
    y = y - 1;
    out = -out;
    posX = posX + wHalf * out;
    f(posX, h * y, face);
  }
  face = 'BACK';
  dir = out === -1 ? -1 : 0;
  while (x < Math.floor(width / 2)) {
    y = y + dir;
    x = x + (y <= -height ? 0 : 1);
    if (dir === 0) {
      posX = posX + w;
      dir = y > -height ? -1 : 1;
    } else {
      posX = posX + wHalf;
      dir = 0;
    }
    f(posX, h * y, face);
  }
  face = 'SIDE';
  out = dir === 0 ? 1 : -1;
  while (y < height - 1) {
    y = y + 1;
    out = -out;
    posX = posX + wHalf * out;
    f(posX, h * y, face);
  }
  dir = out === -1 ? 0 : 1;
  face = 'FRONT';
  while (x >= 0) {
    y = y + dir;
    x = x - (y >= height ? 0 : 1);
    if (dir === 0) {
      posX = posX - w;
      dir = y < height ? 1 : -1;
    } else {
      posX = posX - wHalf;
      dir = 0;
    }
    f(posX, h * y, face);
  }
}

function doHexBodyShape(width, height, f) {
  if (width > height) {
    doHexWideBodyShape(width, height, f);
  } else {
    doHexLongBodyShape(width, height, f);
  }
}

function longBodyShape(drawing, width, height, lineWidth, frontColor, sideColor, backColor, lineAlpha) {
  const radius = width / 2;
  const side = (height - width) / 2;
  drawing
    .moveTo(radius, side)
    .lineStyle(lineWidth, frontColor, lineAlpha)
    .arc(0, side, radius, faceAngels.frontStart, faceAngels.frontEnd)
    .lineStyle(lineWidth, sideColor, lineAlpha)
    .lineTo(-radius, -side)
    .arc(0, -side, radius, faceAngels.frontEnd, faceAngels.rightEnd)
    .lineStyle(lineWidth, backColor, lineAlpha)
    .arc(0, -side, radius, faceAngels.rightEnd, faceAngels.backEnd)
    .lineStyle(lineWidth, sideColor, lineAlpha)
    .arc(0, -side, radius, faceAngels.backEnd, faceAngels.leftEnd)
    .lineTo(radius, side);
}

function longFacingShape(drawing, width, height, frontColor, sideColor, backColor, lineAlpha) {
  const radius = width / 2;
  const side = (height - width) / 2;
  drawing
    .lineStyle(0, 1, 0)
    .moveTo(radius, side)
    .beginFill(frontColor, lineAlpha)
    .arc(0, side, radius, faceAngels.frontStart, faceAngels.frontEnd)
    .lineTo(radius, side)
    .endFill()
    .moveTo(0, -side)
    .beginFill(sideColor, lineAlpha)
    .lineTo(0, side)
    .lineTo(-radius, side)
    .lineTo(-radius, -side)
    .arc(0, -side, radius, faceAngels.frontEnd, faceAngels.rightEnd)
    .lineTo(0, -side)
    .endFill()
    .beginFill(sideColor, lineAlpha)
    .lineTo(0, side)
    .lineTo(radius, side)
    .lineTo(radius, -side)
    .arc(0, -side, radius, faceAngels.leftEnd, faceAngels.backEnd, true)
    .lineTo(0, -side)
    .endFill()
    .moveTo(0, -side)
    .beginFill(backColor, lineAlpha)
    .arc(0, -side, radius, faceAngels.rightEnd, faceAngels.backEnd)
    .lineTo(0, -side)
    .endFill();
}

function wideBodyShape(drawing, width, height, lineWidth, frontColor, sideColor, backColor, lineAlpha) {
  const radius = height / 2;
  const side = (width - height) / 2;
  drawing
    .moveTo(-side, radius)
    .lineStyle(lineWidth, frontColor, lineAlpha)
    .arc(-side, 0, radius, faceAngels.forward, faceAngels.frontEnd)
    .lineStyle(lineWidth, sideColor, lineAlpha)
    .arc(-side, 0, radius, faceAngels.frontEnd, faceAngels.rightEnd)
    .lineStyle(lineWidth, backColor, lineAlpha)
    .arc(-side, 0, radius, faceAngels.rightEnd, faceAngels.backward)
    .lineTo(side, -radius)
    .arc(side, 0, radius, faceAngels.backward, faceAngels.backEnd)
    .lineStyle(lineWidth, sideColor, lineAlpha)
    .arc(side, 0, radius, faceAngels.backEnd, faceAngels.leftEnd)
    .lineStyle(lineWidth, frontColor, lineAlpha)
    .arc(side, 0, radius, faceAngels.leftEnd, faceAngels.forward)
    .lineTo(-side, radius);
}

function wideFacingShape(drawing, width, height, frontColor, sideColor, backColor, lineAlpha) {
  const radius = height / 2;
  const side = (width - height) / 2;
  drawing
    .lineStyle(0, 1, 0)
    .moveTo(-side, radius)
    .beginFill(frontColor, lineAlpha)
    .arc(-side, 0, radius, faceAngels.forward, faceAngels.frontEnd)
    .lineTo(side, 0)
    .arc(side, 0, radius, faceAngels.leftEnd, faceAngels.forward)
    .lineTo(-side, radius)
    .endFill()
    .moveTo(-side, 0)
    .beginFill(sideColor, lineAlpha)
    .lineTo(-side - radius, 0)
    .arc(-side, 0, radius, faceAngels.frontEnd, faceAngels.rightEnd)
    .lineTo(-side, 0)
    .endFill()
    .moveTo(side, 0)
    .beginFill(sideColor, lineAlpha)
    .lineTo(side + radius, 0)
    .arc(side, 0, radius, faceAngels.leftEnd, faceAngels.backEnd, true)
    .lineTo(side, 0)
    .endFill()
    .moveTo(-side, 0)
    .beginFill(backColor, lineAlpha)
    .arc(-side, 0, radius, faceAngels.rightEnd, faceAngels.backward)
    .lineTo(side, -radius)
    .arc(side, 0, radius, faceAngels.backward, faceAngels.backEnd)
    .lineTo(side, 0)
    .lineTo(-side, 0)
    .endFill();
}

function bodyShape(drawing, width, height, lineWidth, frontColor, sideColor, backColor, lineAlpha) {
  if (width > height) {
    wideBodyShape(drawing, width, height, lineWidth, frontColor, sideColor, backColor, lineAlpha);
  } else {
    longBodyShape(drawing, width, height, lineWidth, frontColor, sideColor, backColor, lineAlpha);
  }
}

//Because line segment don't join nice when the color changes, draw the line segment as trapezoids.
//This only works correctly at convex angles. But the artifact at concave angels is hidden by the drawing order, so we don't care.
function drawHexSegment(drawing, startX, startY, endX, endY, width, offset) {
  let points = [];

  //half the amount a hex edge get longer when translated 1 outward
  const fact = 1 / Math.sqrt(3);

  //direction vector
  const dx = endX - startX;
  const dy = endY - startY;
  const l = Math.sqrt(dx * dx + dy * dy);
  //unit vector
  const udx = dx / l;
  const udy = dy / l;
  //udy, -udx is the perpendicular vector (note the x,y swap)
  // start point, translated offset outward and moved tho lengthen the line offset * fact
  const nx = startX + udy * offset - udx * offset * fact;
  const ny = startY - udx * offset - udy * offset * fact;

  points.push(nx, ny);

  //start point, translated (offset+width) outward and moved tho lengthen the line (offset+width) + fact
  const nx2 = startX + udy * (offset + width) - udx * (offset + width) * fact;
  const ny2 = startY - udx * (offset + width) - udy * (offset + width) * fact;

  points.push(nx2, ny2);

  //endpoint of outer line
  const nx3 = nx2 + dx + udx * (offset + width) * 2 * fact;
  const ny3 = ny2 + dy + udy * (offset + width) * 2 * fact;

  points.push(nx3, ny3);

  //endpoint of inner line
  const nx4 = nx + dx + udx * offset * 2 * fact;
  const ny4 = ny + dy + udy * offset * 2 * fact;

  points.push(nx4, ny4);

  drawing.drawPolygon(points);
}

function hexBodyShape(
  drawing,
  width,
  height,
  lineWidth,
  lineOffset,
  frontColor,
  sideColor,
  backColor,
  lineAlpha,
) {
  let lastX = null;
  let lastY = null;

  let f = (x, y, face) => {
    const faceColor = face === 'FRONT' ? frontColor : face === 'SIDE' ? sideColor : backColor;
    drawing.lineStyle(lineWidth, faceColor, lineAlpha);

    if (lastX === null || lastY === null) {
      drawing.moveTo(x, y);
    } else {
      drawing.lineTo(x, y);
    }
    lastX = x;
    lastY = y;
  };

  let f2 = (x, y, face) => {
    const faceColor = face === 'FRONT' ? frontColor : face === 'SIDE' ? sideColor : backColor;
    drawing.lineStyle(1, faceColor, lineAlpha, 0);
    drawing.beginFill(faceColor, lineAlpha);

    if (lastX !== null && lastY !== null) {
      drawHexSegment(
        drawing,
        Math.round(lastX),
        Math.round(lastY),
        Math.round(x),
        Math.round(y),
        lineWidth,
        lineOffset,
      );
    }
    drawing.endFill();
    lastX = x;
    lastY = y;
  };

  doHexBodyShape(width, height, lineWidth > 1 ? f2 : f);
}

function facingShape(drawing, width, height, frontColor, sideColor, backColor, lineAlpha) {
  if (width > height) {
    wideFacingShape(drawing, width, height, frontColor, sideColor, backColor, lineAlpha);
  } else {
    longFacingShape(drawing, width, height, frontColor, sideColor, backColor, lineAlpha);
  }
}

const PIXI$4 = window.PIXI;

function getDirection(token) {
  return token.document.rotation;
}

function normalizeAngle(angle) {
  return ((angle % 360) + 360) % 360;
}

function toRadians(angle) {
  return (angle / 180) * Math.PI;
}

function rotatePoint(point, angle) {
  const mat = new PIXI$4.Matrix();
  mat.rotate(toRadians(angle));
  return mat.apply(point);
}

function getGridType() {
  return Math.floor(canvas.grid.type / 2);
}

function clipRotationToFaces(tokenDocument, updates) {
  const noRotation = updates.rotation === undefined || tokenDocument.rotation === updates.rotation;
  const noMovement = !(Number.isNumeric(updates.x) || Number.isNumeric(updates.y));
  if (noRotation || noMovement) return;
  if (!canvas.grid?.type) return;

  const tokenDirection = updates.rotation + 90;

  const directions = [
    [45, 90, 135, 180, 225, 270, 315, 360], // Square
    [0, 60, 120, 180, 240, 300, 360], // Hex Rows
    [30, 90, 150, 210, 270, 330, 390], // Hex Columns
  ];
  const gridType = getGridType();
  const facings = directions[gridType];
  if (facings && facings.length) {
    // convert negative dirs into a range from 0-360
    const normalizedDir = ((tokenDirection % 360) + 360) % 360; // Math.round(tokenDirection < 0 ? 360 + tokenDirection : tokenDirection);
    // find the largest normalized angle
    const secondAngle = facings.reduceRight((prev, curr) => (curr < prev && curr > normalizedDir ? curr : prev)); // facings.find((e) => e > normalizedDir);
    // and assume the facing is 60 degrees (hexes) or 45 (square) to the counter clockwise
    const nextTokenDirection = gridType ? secondAngle - 60 : secondAngle - 45;
    // unless the largest angle was closer
    const newTokenDirection =
      secondAngle - normalizedDir < normalizedDir - nextTokenDirection ? secondAngle : nextTokenDirection;
    // return tokenDirection to the range 180 to -180
    const finalTokenDirection = newTokenDirection > 180 ? newTokenDirection - 360 : newTokenDirection;
    // set new rotation
    updates.rotation = finalTokenDirection - 90;
  }
}

function drawReachIndicator(token) {
  try {
    const { w: width, h: height } = token;
    const { scaleY, scaleX } = token.document.texture;
    let anchorX, anchorY;
    if (token.document.gurpsGridless) {
      ({ anchorX, anchorY } = token.document.gurpsGridless);
    } else {
      ({ anchorX, anchorY } = token.document.texture);
    }

    const widthG = (width * canvas.grid.sizeY) / canvas.grid.sizeX;

    // Create or update the range indicator
    if (!token.reachIndicator || token.reachIndicator._destroyed) {
      const container = new PIXI.Container({ name: 'reachIndicator', width, height }); //eslint-disable-line no-undef
      container.name = 'reachIndicator';

      const g = new PIXI.Graphics(); //eslint-disable-line no-undef

      //add the graphics to the containerS
      container.addChild(g);
      container.graphics = g;
      token.reachIndicator = container;
      //add the container to the token
      token.addChild(container);
    }

    const maxReach = token.document.flags[MODULE_ID]?.maxReachShown ?? game.settings.get(MODULE_ID, 'maxReachShown');

    token.reachIndicator.width = width;
    token.reachIndicator.height = height;
    token.reachIndicator.x = width * 0.5; //(1 - anchorX);
    token.reachIndicator.y = height * 0.5; //(1 - anchorY);

    const graphics = token.reachIndicator.graphics;
    graphics.clear();

    const { lineAlpha, fillAlpha, lineColor, frontColor, sideColor, backColor } = getColorConfig();

    const gridSize = canvas.grid.size;

    for (let r = 1; r <= maxReach; r++) {
      bodyShape(
        graphics,
        widthG + r * 2 * gridSize,
        height + r * 2 * gridSize,
        2,
        lineColor,
        lineColor,
        lineColor,
        lineAlpha,
      );
    }

    const overdraw = game.settings.get(MODULE_ID, 'reachIndicatorOverdraw') ?? 0.5;
    facingShape(
      graphics,
      widthG + (maxReach * 2 + overdraw * 2) * gridSize,
      height + (maxReach * 2 + overdraw * 2) * gridSize,
      frontColor,
      sideColor,
      backColor,
      fillAlpha,
    );

    //update the rotation of the indicator
    token.reachIndicator.pivot.x = widthG * (anchorX - 0.5) * scaleX;
    token.reachIndicator.pivot.y = height * (anchorY - 0.5) * scaleY;
    token.reachIndicator.angle = getDirection(token);

    token.reachIndicator.graphics.visible =
      (game.gurpsGridLess.showRangeIndicator && token.controlled) || game.gurpsGridLess.showRangeIndicatorAll;
  } catch (error) {
    console.error(
      `GURPS gridless | Error drawing the reach indicator for token ${token?.name} (ID: ${token?.id}, Type: ${
        token?.document?.actor?.type ?? null
      })`,
      error,
    );
  }
}

function drawEachReachIndicator() {
  canvas.tokens.objects.children.forEach(drawReachIndicator);
}

function updateSceneTokens(sceneDocument, changed) {
  if (changed.grid) {
    sceneDocument.tokens.forEach((t) => setTokenDimensions$1(t));
  }
}

function enableGURPSMovementForScene(sceneDocument) {
  sceneDocument.tokens.forEach((t) => setTokenDimensionsOnEnable(t));
}

function disableGURPSMovementForScene(sceneDocument) {
  sceneDocument.tokens.forEach((t) => resetTokenDimensionsOnDisable(t));
}

function enableGURPSMovementForAllScenes() {
  game.scenes.forEach((t) => enableGURPSMovementForScene(t));
}

function disableGURPSMovementForAllScenes() {
  game.scenes.forEach((t) => disableGURPSMovementForScene(t));
}

/* original function
  _getVisionSourceData() {
    const {x, y} = this.#adjustedCenter;
    const {elevation, rotation} = this.document;
    const sight = this.document.sight;
    return {
      x, y, elevation, rotation,
      radius: this.sightRange,
      lightRadius: this.lightPerceptionRange,
      externalRadius: this.externalRadius,
      angle: sight.angle,
      contrast: sight.contrast,
      saturation: sight.saturation,
      brightness: sight.brightness,
      attenuation: sight.attenuation,
      visionMode: sight.visionMode,
      color: sight.color,
      preview: this.isPreview,
      disabled: this.#isUnreachableDragPreview
    };
  }
  */
function _getVisionSourceData() {
  const d = canvas.dimensions;
  const { x, y } = this.center;

  const GURPSMovementEnabled = game.settings.get(MODULE_ID, 'GURPSMovementEnabled');
  const anchorY = GURPSMovementEnabled
    ? this.document.gurpsGridless?.anchorY ?? this.document.texture.anchorY
    : this.document.texture.anchorY;

  const length = GURPSMovementEnabled
    ? this.document.flags[MODULE_ID]?.tokenLength ?? this.document.height
    : this.document.height;

  const radius =
    isHexGrid() ?? GURPSMovementEnabled
      ? this.externalRadius * (length + (anchorY - 0.5) * 2 ?? 1)
      : this.h * anchorY ?? this.externalRadius;

  const { elevation, rotation } = this.document;
  const sight = this.document.sight;
  return {
    x,
    y,
    elevation,
    rotation,
    radius: Math.clamp(this.sightRange, 0, d.maxR),
    lightRadius: Math.clamp(this.lightPerceptionRange, 0, d.maxR),
    externalRadius: radius, //this.externalRadius,
    angle: sight.angle,
    contrast: sight.contrast,
    saturation: sight.saturation,
    brightness: sight.brightness,
    attenuation: sight.attenuation,
    visionMode: sight.visionMode,
    color: sight.color,
    preview: this.isPreview,
    disabled: false,
  };
}

function setVisionAdjustment(enabled) {
  if (typeof libWrapper === 'function') {
    if (enabled) {
      libWrapper.register(MODULE_ID, 'Token.prototype._getVisionSourceData', _getVisionSourceData, 'MIXED'); //eslint-disable-line no-undef
    } else {
      libWrapper.unregister_all(MODULE_ID); //eslint-disable-line no-undef
    }
  }
}

const PIXI$3 = window.PIXI;

function doBorder(token) {
  const {
    frontColor: frontColor,
    sideColor: sideColor,
    backColor: backColor,
    borderAlpha: borderAlpha,
  } = getColorConfig();

  if (!token.GURPSGridlessOuterBorder) {
    token.GURPSGridlessOuterBorder = new PIXI$3.Graphics();
    token.addChild(token.GURPSGridlessOuterBorder);
  }

  const { w: width, h: height } = token;
  let anchorX, anchorY;
  if (token.document.gurpsGridless?.anchorX) {
    ({ anchorX, anchorY } = token.document.gurpsGridless);
  } else {
    ({ anchorX, anchorY } = token.document.texture);
  }
  token.border.x = width * 0.5;
  token.border.y = height * 0.5;
  token.border.clear();

  token.GURPSGridlessOuterBorder.x = width * 0.5;
  token.GURPSGridlessOuterBorder.y = height * 0.5;
  token.GURPSGridlessOuterBorder.clear();

  token.border.tint = 0xffffff;

  const borderColor = token._getBorderColor();
  const innerWidth = game.settings.get(MODULE_ID, 'innerBorderWidth') ?? 6;
  const outerWidth = game.settings.get(MODULE_ID, 'outerBorderWidth') ?? 6;

  if (isHexGrid() && game.settings.get(MODULE_ID, 'GURPSMovementEnabled')) {
    hexBodyShape(
      token.GURPSGridlessOuterBorder,
      token.document.flags[MODULE_ID]?.tokenWidth,
      token.document.flags[MODULE_ID]?.tokenLength,
      outerWidth,
      0,
      frontColor,
      sideColor,
      backColor,
      borderAlpha,
    );
    hexBodyShape(
      token.border,
      token.document.flags[MODULE_ID]?.tokenWidth,
      token.document.flags[MODULE_ID]?.tokenLength,
      innerWidth,
      -innerWidth,
      borderColor,
      borderColor,
      borderColor,
      borderAlpha,
    );
  } else {
    bodyShape(token.border, width, height, innerWidth, borderColor, borderColor, borderColor, 1);
    bodyShape(
      token.GURPSGridlessOuterBorder,
      width + 2 * innerWidth,
      height + 2 * innerWidth,
      outerWidth,
      frontColor,
      sideColor,
      backColor,
      borderAlpha,
    );
  }

  //move the token image when shifted because of close range
  const tokenDirection = getDirection(token);
  // Read shift from in-memory gurpsGridless first, fall back to persisted flags for other clients
  const shift = token.document.gurpsGridless?.shift
    ?? token.document.flags?.[MODULE_ID]?.shift
    ?? { x: 0, y: 0 };
  const shiftDist = token.document.gurpsGridless?.shiftDist
    ?? token.document.flags?.[MODULE_ID]?.shiftDist
    ?? 0;
  const shiftAngle = token.document.gurpsGridless?.shiftAngle
    ?? token.document.flags?.[MODULE_ID]?.shiftAngle
    ?? 0;
  const rShift = rotatePoint(shift, tokenDirection);
  token.mesh.y = token.y + token.h * 0.5 - rShift.y;
  token.mesh.x = token.x + token.w * 0.5 - rShift.x;

  if (!token.GURPSGridlessShiftIndicator) {
    token.GURPSGridlessShiftIndicator = new PIXI$3.Graphics();
    token.addChild(token.GURPSGridlessShiftIndicator);
  }
  token.GURPSGridlessShiftIndicator.clear();
  if (shiftDist) {
    let dist = shiftDist;
    const edgeOffset = Math.min(width, height) * 0.5; // distance from center to token edge
    token.GURPSGridlessShiftIndicator.x = width * 0.5;
    token.GURPSGridlessShiftIndicator.y = height * 0.5;
    token.GURPSGridlessShiftIndicator.moveTo(0, 0)
      .lineStyle(1, 'black', 1)
      // Arrow starts at the token edge (edgeOffset above center) and points further out
      .moveTo(0, -(edgeOffset + 4))
      .beginFill('lightGray')
      .lineTo(-1, -(edgeOffset + 4))
      .lineTo(-1, -(edgeOffset + dist - 6))
      .lineTo(-6, -(edgeOffset + dist - 6))
      .lineTo(0, -(edgeOffset + dist))
      .lineTo(6, -(edgeOffset + dist - 6))
      .lineTo(1, -(edgeOffset + dist - 6))
      .lineTo(1, -(edgeOffset + 4))
      .lineTo(-1, -(edgeOffset + 4))
      .endFill();
    token.GURPSGridlessShiftIndicator.angle = tokenDirection + shiftAngle;
  }

  token.border.pivot.y = height * (anchorY - 0.5) + shift.y;
  token.border.pivot.x = width * (anchorX - 0.5) + shift.x;
  token.border.angle = tokenDirection;
  token.GURPSGridlessOuterBorder.pivot.y = height * (anchorY - 0.5) + shift.y;
  token.GURPSGridlessOuterBorder.pivot.x = width * (anchorX - 0.5) + shift.x;
  token.GURPSGridlessOuterBorder.angle = tokenDirection;
  token.GURPSGridlessOuterBorder.visible =
    game.settings.get(MODULE_ID, 'alwaysShowOuterBorder') || token.border.visible;
}

function doEachBorder() {
  canvas.tokens.objects.children.forEach(doBorder);
}

const toolButtonName = 'gurps-gridless-toggleRotationOnMovement';

function isToolbarButtonEnabled() {
  return game.settings.get(MODULE_ID, 'showToggleRotaionButton');
}

function createToggleRotationButton(controls) {
  if (isToolbarButtonEnabled()) {
    const tokenButton = controls.tokens;
    if (tokenButton) {
      const newButton = {
        name: toolButtonName,
        title: game.i18n.localize('gurps-gridless.button.toggleRotationOnMove.name'),
        icon: 'fas fa-rotate',
        toggle: true,
        active: !game.gurpsGridLess.suppressRotationOnMove,
        visible: true,
        onChange: () => {
          game.gurpsGridLess.suppressRotationOnMove = !game.gurpsGridLess.suppressRotationOnMove;
        },
      };
      tokenButton.tools[toolButtonName] = newButton;
    }
  }
}

function toggleRotationOnMovement() {
  game.gurpsGridLess.suppressRotationOnMove = !game.gurpsGridLess.suppressRotationOnMove;
  if (isToolbarButtonEnabled() && !!ui.controls?.controls?.tokens) {
    ui.controls.controls.tokens.tools[toolButtonName].active = !game.gurpsGridLess.suppressRotationOnMove;
    ui.controls.render();
  }
}

async function retreat(token) {
  const point = { x: token.document.x, y: token.document.y, elevation: token.document.elevation };
  const direction = token.document.rotation - 90;
  const newPoint = canvas.grid.getTranslatedPoint(point, direction, 1);
  const [, constraint] = token.constrainMovementPath([point, newPoint]);
  if (!constraint) {
    token.document.move(newPoint, { autoRotate: false, constrainOptions: { ignoreWalls: false } });
  }
}

function retreatControlledTokens() {
  for (let token of canvas.tokens.controlled) {
    retreat(token);
  }
}

/* eslint-disable prettier/prettier */

class GURPSGridLess {
  constructor() {
    this.showRangeIndicator = false;
    this.showRangeIndicatorAll = false;
    this.suppressRotationOnMove = false;
  }
  showRangeIndicator;
  showRangeIndicatorALL;
  suppressRotationOnMove;
}

function onGURPSMovementEnabledChanged(enabled) {
  if (enabled) {
    enableGURPSMovementForAllScenes();
  } else {
    disableGURPSMovementForAllScenes();
  }
}

function registerSettings() {
  game.keybindings.register(MODULE_ID, 'showRangeIndicator', {
    name: 'gurps-gridless.keybindings.showRangeIndicator.name',
    hint: 'gurps-gridless.keybindings.showRangeIndicator.hint',
    editable: [
      {
        key: 'KeyI',
      },
    ],
    onDown: () => {
      game.gurpsGridLess.showRangeIndicator = true;
      drawEachReachIndicator();
    },
    onUp: () => {
      game.gurpsGridLess.showRangeIndicator = false;
      drawEachReachIndicator();
    },
    restricted: false,
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
  });

  game.keybindings.register(MODULE_ID, 'showRangeIndicatorAll', {
    name: 'gurps-gridless.keybindings.showRangeIndicatorAll.name',
    hint: 'gurps-gridless.keybindings.showRangeIndicatorAll.hint',
    editable: [
      {
        key: 'KeyI',
        modifiers: ['SHIFT'],
      },
    ],
    onDown: () => {
      game.gurpsGridLess.showRangeIndicatorAll = true;
      drawEachReachIndicator();
    },
    onUp: () => {
      game.gurpsGridLess.showRangeIndicatorAll = false;
      drawEachReachIndicator();
    },
    restricted: false,
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
  });

  game.keybindings.register(MODULE_ID, 'toggleRotationOnMove', {
    name: 'gurps-gridless.keybindings.toggleRotationOnMove.name',
    hint: 'gurps-gridless.keybindings.toggleRotationOnMove.hint',
    editable: [
      {
        key: 'KeyV',
      },
    ],
    onUp: toggleRotationOnMovement,
    restricted: false,
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
  });

  game.keybindings.register(MODULE_ID, 'retreat', {
    name: 'gurps-gridless.keybindings.retreat.name',
    hint: 'gurps-gridless.keybindings.retreat.hint',
    editable: [
      {
        key: 'KeyB',
      },
    ],
    onUp: retreatControlledTokens,
    restricted: false,
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
  });

  game.settings.register(MODULE_ID, 'version', {
    scope: 'world',
    config: false,
    default: '0.0.0',
    type: String,
  });

  game.settings.register(MODULE_ID, 'maxReachShown', {
    name: 'gurps-gridless.settings.maxReachShown.name',
    hint: 'gurps-gridless.settings.maxReachShown.description',
    scope: 'world',
    config: true,
    default: 2.0,
    type: Number,
    range: {
      min: 0.0,
      max: 15.0,
      step: 1.0,
    },
  });

  game.settings.register(MODULE_ID, 'reachIndicatorOverdraw', {
    name: 'gurps-gridless.settings.reachIndicatorOverdraw.name',
    hint: 'gurps-gridless.settings.reachIndicatorOverdraw.description',
    scope: 'world',
    config: true,
    default: 0.5,
    type: Number,
    range: {
      min: 0.0,
      max: 1.0,
      step: 0.1,
    },
  });

  game.settings.register(MODULE_ID, 'reachLineAlpha', {
    name: 'gurps-gridless.settings.reachLineAlpha.name',
    hint: 'gurps-gridless.settings.reachLineAlpha.description',
    scope: 'world',
    config: true,
    default: defaultColors.lineAlpha,
    type: Number,
    range: {
      min: 0.0,
      max: 1.0,
      step: 0.05,
    },
  });

  game.settings.register(MODULE_ID, 'facingAlpha', {
    name: 'gurps-gridless.settings.facingAlpha.name',
    hint: 'gurps-gridless.settings.facingAlpha.description',
    scope: 'world',
    config: true,
    default: defaultColors.fillAlpha,
    type: Number,
    range: {
      min: 0.0,
      max: 1.0,
      step: 0.05,
    },
  });

  game.settings.register(MODULE_ID, 'innerBorderWidth', {
    name: 'gurps-gridless.settings.innerBorderWidth.name',
    hint: 'gurps-gridless.settings.innerBorderWidth.description',
    scope: 'world',
    config: true,
    default: 6.0,
    type: Number,
    range: {
      min: 0.0,
      max: 20.0,
      step: 1.0,
    },
  });

  game.settings.register(MODULE_ID, 'outerBorderWidth', {
    name: 'gurps-gridless.settings.outerBorderWidth.name',
    hint: 'gurps-gridless.settings.outerBorderWidth.description',
    scope: 'world',
    config: true,
    default: 6.0,
    type: Number,
    range: {
      min: 0.0,
      max: 20.0,
      step: 1.0,
    },
  });

  game.settings.register(MODULE_ID, 'alwaysShowOuterBorder', {
    name: 'gurps-gridless.settings.alwaysShowOuterBorder.name',
    hint: 'gurps-gridless.settings.alwaysShowOuterBorder.description',
    scope: 'world',
    config: true,
    default: false,
    type: Boolean,
    onChange: doEachBorder,
  });

   game.settings.register(MODULE_ID, 'borderAlpha', {
    name: 'gurps-gridless.settings.borderAlpha.name',
    hint: 'gurps-gridless.settings.borderAlpha.description',
    scope: 'world',
    config: true,
    default: defaultColors.borderAlpha,
    type: Number,
    range: {
      min: 0.0,
      max: 1.0,
      step: 0.05,
    },
  });

  game.settings.register(MODULE_ID, 'GURPSMovementEnabled', {
    name: 'gurps-gridless.settings.GURPSMovementEnabled.name',
    hint: 'gurps-gridless.settings.GURPSMovementEnabled.description',
    scope: 'world',
    config: true,
    default: false,
    type: Boolean,
    onChange: onGURPSMovementEnabledChanged,
    requiresReload: true,
  });

  game.settings.register(MODULE_ID, 'VisionAdjustmetEnabled', {
    name: 'gurps-gridless.settings.VisionAdjustmentEnabled.name',
    hint: 'gurps-gridless.settings.VisionAdjustmentEnabled.description',
    scope: 'world',
    config: true,
    default: true,
    type: Boolean,
    onChange: setVisionAdjustment,
  });

  game.settings.register(MODULE_ID, 'showToggleRotaionButton', {
    name: 'gurps-gridless.settings.showToggleRotationButton.name',
    hint: 'gurps-gridless.settings.showToggleRotationButton.description',
    scope: 'world',
    config: true,
    default: true,
    type: Boolean,
    requiresReload: true,
  });

  game.settings.register(MODULE_ID, 'showFacingIndicator', {
    name: 'gurps-gridless.settings.showFacingIndicator.name',
    hint: 'gurps-gridless.settings.showFacingIndicator.description',
    scope: 'world',
    config: true,
    default: true,
    type: Boolean,
    requiresReload: true,
  });

  game.settings.register(MODULE_ID, 'facingIndicatorGap', {
    name: 'gurps-gridless.settings.facingIndicatorGap.name',
    hint: 'gurps-gridless.settings.facingIndicatorGap.description',
    scope: 'world',
    config: true,
    default: 0.2,
    type: Number,
    range: {
      min: 0.0,
      max: 1.0,
      step: 0.1,
    },
    requiresReload: true,
  });

game.settings.register(MODULE_ID, 'facingIndicatorScale', {
    name: 'gurps-gridless.settings.facingIndicatorScale.name',
    hint: 'gurps-gridless.settings.facingIndicatorScale.description',
    scope: 'world',
    config: true,
    default: 1,
    type: Number,
    range: {
      min: 0.1,
      max: 5.0,
      step: 0.05,
    },
    requiresReload: true,
  });

game.settings.register(MODULE_ID, 'facingIndicatorFillColor', {
    name: 'gurps-gridless.settings.facingIndicatorFillColor.name',
    hint: 'gurps-gridless.settings.facingIndicatorFillColor.description',
    scope: 'world',
    type: new foundry.data.fields.ColorField(),
    config: true,
    default: "#000000",
    requiresReload: true,
  });

game.settings.register(MODULE_ID, 'facingIndicatorLineColor', {
    name: 'gurps-gridless.settings.facingIndicatorLineColor.name',
    hint: 'gurps-gridless.settings.facingIndicatorLineColor.description',
    scope: 'world',
    type: new foundry.data.fields.ColorField(),
    config: true,
    default: "#ffffff",
    requiresReload: true,
  });

game.settings.register(MODULE_ID, 'facingIndicatorAlpha', {
    name: 'gurps-gridless.settings.facingIndicatorAlpha.name',
    hint: 'gurps-gridless.settings.facingIndicatorAlpha.description',
    scope: 'world',
    config: true,
    default: defaultColors.indicatorAlpha,
    type: Number,
    range: {
      min: 0.0,
      max: 1.0,
      step: 0.05,
    },
    requiresReload: true,
  });

game.settings.register(MODULE_ID, 'facingIndicatorImage', {
    name: 'gurps-gridless.settings.facingIndicatorImage.name',
    hint: 'gurps-gridless.settings.facingIndicatorImage.description',
    scope: 'world',
    config: true,
    default: "",
    filePicker: true,
    requiresReload: true,
  });

  game.settings.register(MODULE_ID, 'shiftTokensinSameHex', {
    name: 'gurps-gridless.settings.shiftTokensInSameHex.name',
    hint: 'gurps-gridless.settings.shiftTokensInSameHex.description',
    scope: 'world',
    config: true,
    default: false,
    type: Boolean,
    requiresReload: true,
  });

  game.settings.register(MODULE_ID, 'tokenShiftDistance', {
    name: 'gurps-gridless.settings.tokenShiftDistance.name',
    hint: 'gurps-gridless.settings.tokenShiftDistance.description',
    scope: 'world',
    config: true,
    default: 0.4,
    type: Number,
    range: {
      min: 0.1,
      max: 1.0,
      step: 0.1,
    },
    requiresReload: true,
  });


  setVisionAdjustment(game.settings.get(MODULE_ID, 'VisionAdjustmetEnabled'));
}

function generateElement(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstChild;
}

function modifyTokenConfig(app, html, data) {
  if (game.settings.get(MODULE_ID, 'GURPSMovementEnabled')) {
    html.classList.add('gurps-gridless-active');

    const injectionPoint = html.querySelector('.tab[data-tab="appearance"] file-picker[name="texture.src"]').parentNode.parentNode;
    const injectHtml = generateElement(`<div class="form-group slim"><label>${game.i18n.localize(
          'gurps-gridless.tokenSettings.explanation',
        )}</label></div>`,);
    injectionPoint.after(injectHtml);

     const indicatorEnabled = data.source.flags?.[MODULE_ID]?.facingIndicatorEnabled;
    if (indicatorEnabled === undefined){
       const indicatorEnabledCheckbox = html.querySelector('input[name="flags.gurps-gridless.facingIndicatorEnabled"]');
       indicatorEnabledCheckbox.checked = true;
    }
  }

}

function addTokenConfigTab(app) {
	app.TABS.sheet.tabs.push({ id: MODULE_ID, label: game.i18n.localize('gurps-gridless.tokenSettings.tab.name'), icon: "far fa-circle" });
    const footer = app.PARTS.footer;
    delete app.PARTS.footer;
    if (game.settings.get(MODULE_ID, 'GURPSMovementEnabled')) {
        app.PARTS[MODULE_ID] = {template: "modules/gurps-gridless/templates/gurpsgridlessTokenConfig.hbs", scrollable: [""]};
    } else {
        app.PARTS[MODULE_ID] = {template: "modules/gurps-gridless/templates/gurpsgridlessSimpleTokenConfig.hbs", scrollable: [""]};
    }
    app.PARTS.footer = footer;
}

function getColorConfig() {
    const config = Object.assign({}, defaultColors);
    config.lineAlpha = game.settings.get(MODULE_ID, 'reachLineAlpha') ?? defaultColors.lineAlpha;
    config.fillAlpha = game.settings.get(MODULE_ID, 'facingAlpha') ?? defaultColors.fillAlpha;
    config.indicatorAlpha = game.settings.get(MODULE_ID, 'facingIndicatorAlpha') ?? defaultColors.indicatorAlpha;
    config.borderAlpha = game.settings.get(MODULE_ID, 'borderAlpha') ?? defaultColors.borderAlpha;
    config.indicatorFillColor = game.settings.get(MODULE_ID, 'facingIndicatorFillColor') ?? defaultColors.indicatorFillColor;
    config.indicatorLineColor = game.settings.get(MODULE_ID, 'facingIndicatorLineColor') ?? defaultColors.indicatorLineColor;
    return config;
}

const PIXI$2 = window.PIXI;

function rectangleHitArea(token) {
  const { w: width, h: height } = token;
  return [new PIXI$2.Point(0, 0), new PIXI$2.Point(width, 0), new PIXI$2.Point(width, height), new PIXI$2.Point(0, height)];
}

function hexHitArea(token) {
  const { w: widthPx, h: heightPx } = token;
  let points = [];

  let f = (x, y) => {
    points.push(new PIXI$2.Point(x + widthPx / 2, y + heightPx / 2));
  };

  doHexBodyShape(token.document.flags[MODULE_ID]?.tokenWidth, token.document.flags[MODULE_ID]?.tokenLength, f);

  return points;
}

function drawHitArea(token) {
  const points =
    isHexGrid() && game.settings.get(MODULE_ID, 'GURPSMovementEnabled') ? hexHitArea(token) : rectangleHitArea(token);

  const { w: width, h: height } = token;
  let anchorX, anchorY;
  if (token.document.gurpsGridless?.anchorY) {
    ({ anchorX, anchorY } = token.document.gurpsGridless);
  } else {
    ({ anchorX, anchorY } = token.document.texture);
  }
  const tokenDirection = toRadians(getDirection(token));

  const mat = new PIXI$2.Matrix();
  const shift = token.document.gurpsGridless?.shift ?? { x: 0, y: 0 };
  // eslint-disable-next-line prettier/prettier
  mat.translate(
    -width * (0.5 + (anchorX - 0.5)) - shift.x,
    -height * (0.5 + (anchorY - 0.5)) - shift.y,
  );
  mat.rotate(tokenDirection);
  mat.translate(width * 0.5, height * 0.5);

  const rotatedPoints = points.map((p) => mat.apply(p));

  const hitArea = new PIXI$2.Polygon(rotatedPoints);
  token.shape = hitArea;
  token.hitArea = hitArea;
}

async function setTokenDimensions(tokenDocument, length, width) {
  await tokenDocument.setFlag(MODULE_ID, 'tokenLength', length);
  await tokenDocument.setFlag(MODULE_ID, 'tokenWidth', width);
}

async function setTokenOffsetX(tokenDocument, offset) {
  await tokenDocument.setFlag(MODULE_ID, 'tokenOffsetX', offset);
}

async function setTokenOffsetY(tokenDocument, offset) {
  await tokenDocument.setFlag(MODULE_ID, 'tokenOffsetY', offset);
}

async function setTokenScale(tokenDocument, scale) {
  await tokenDocument.setFlag(MODULE_ID, 'tokenScaling', scale);
}

async function setTokenImageOffsetX(tokenDocument, offset) {
  await tokenDocument.setFlag(MODULE_ID, 'tokenImageOffsetX', offset);
}

async function setTokenImageOffsetY(tokenDocument, offset) {
  await tokenDocument.setFlag(MODULE_ID, 'tokenImageOffsetY', offset);
}

const gurpsGridlessAPI = {
  setTokenDimensions,
  setTokenOffsetX,
  setTokenOffsetY,
  setTokenScale,
  setTokenImageOffsetX,
  setTokenImageOffsetY,
  toggleRotationOnMovement,
  retreat,
};

const PIXI$1 = window.PIXI;

function drawDefaultArrow() {
  const { indicatorLineColor: lineColor, indicatorFillColor: fillColor, indicatorAlpha: alpha } = getColorConfig();
  const indicator = new PIXI$1.Graphics();
  const halfSide = 25;
  const halfHeight = (halfSide * Math.sqrt(3)) / 3;
  indicator
    .lineStyle(3, lineColor, alpha)
    .beginFill(fillColor, alpha)
    .moveTo(0, -halfHeight)
    .lineTo(-halfSide, -halfHeight)
    .lineTo(0, halfHeight)
    .lineTo(halfSide, -halfHeight)
    .lineTo(0, -halfHeight)
    .endFill();
  return indicator;
}

async function doIndicator(tokenDocument) {
  const { w: width, h: height } = tokenDocument.object;
  const indicatorOffset = game.settings.get(MODULE_ID, 'facingIndicatorGap') ?? 0.2;
  const tokenOffset = tokenDocument.flags[MODULE_ID]?.tokenOffsetY ?? 0;
  const container = tokenDocument.object.GURPSGridlessIndicator;
  const scaling =
    (game.settings.get(MODULE_ID, 'facingIndicatorScale') ?? 1) *
    (tokenDocument.flags[MODULE_ID]?.facingIndicatorScale ?? 1);
  const show = tokenDocument.flags[MODULE_ID]?.facingIndicatorEnabled ?? true;
  const indicatorImage =
    tokenDocument.flags[MODULE_ID]?.facingIndicatorImage?.trim() ?? '' !== ''
      ? tokenDocument.flags[MODULE_ID]?.facingIndicatorImage.trim()
      : game.settings.get(MODULE_ID, 'facingIndicatorImage')?.trim() ?? '' !== ''
      ? game.settings.get(MODULE_ID, 'facingIndicatorImage').trim()
      : 'modules/gurps-gridless/assets/simple_arrow.png';
  container.width = width;
  container.height = height;
  container.x = width / 2;
  container.y = height / 2;
  container.pivot.set(0.5);
  container.scale.set(1);
  if (container.imagePath !== indicatorImage) {
    container.removeChild(container.indicator);
    if (indicatorImage === 'modules/gurps-gridless/assets/simple_arrow.png') {
      container.indicator = drawDefaultArrow();
    } else {
      const texture = await PIXI$1.Assets.load(indicatorImage);
      container.indicator = new PIXI$1.Sprite(texture);
    }
    container.addChild(container.indicator);
    container.imagePath = indicatorImage;
  }
  const indicator = container.indicator;
  indicator.scale.set(scaling);
  const gridSize = isHexColumnGrid() ? canvas.grid.sizeY : canvas.grid.sizeX;
  const offset = gridSize * (0.5 - tokenOffset + indicatorOffset);
  indicator.y = offset;
  container.angle = tokenDocument.rotation;
  container.visible = show;
}

function drawIndicator(token) {
  if (!(game.settings.get(MODULE_ID, 'showFacingIndicator') ?? true) || token.GURPSGridlessIndicator) return;
  token.GURPSGridlessIndicator = new PIXI$1.Container();
  token.addChild(token.GURPSGridlessIndicator);
  doIndicator(token.document);
}

function updateIndicatorDirection(token) {
  if (!token?.GURPSGridlessIndicator) return;
  token.GURPSGridlessIndicator.angle = token.document.rotation;
}

function updateIndicator(tokenDocument, changes) {
  if (!tokenDocument.object?.GURPSGridlessIndicator) return;
  if (
    changes.rotation === undefined &&
    changes.flags?.[MODULE_ID]?.tokenOffsetY === undefined &&
    changes.flags?.[MODULE_ID]?.facingIndicatorScale === undefined &&
    changes.flags?.[MODULE_ID]?.facingIndicatorEnabled === undefined &&
    changes.flags?.[MODULE_ID]?.facingIndicatorImage === undefined
  )
    return;
  doIndicator(tokenDocument);
}

const closeRangeThreshold = 0.5;

function tokensInCloseRange(tokenDocument) {
  return tokenDocument.parent.tokens.filter(
    (v) => v.uuid != tokenDocument.uuid && canvas.grid.measurePath([v, tokenDocument]).distance < closeRangeThreshold,
  );
}

function tokensInCloseRangeAt(tokenDocument, x, y) {
  const result = tokenDocument.parent.tokens.filter(
    (v) =>
      v.uuid != tokenDocument.uuid &&
      canvas.grid.measurePath([
        { x: v.x, y: v.y },
        { x: x, y: y },
      ]).distance < closeRangeThreshold,
  );
  result.push(tokenDocument);
  return result;
}

function calculateShift2(tokenDocuments, getTokenDirection) {
  /* 
  for each group of tokens with the same starting angle find the optimal starting position,
  so that no token has the same angle and, if enough space, it gets shifted backwards.
  Assumes tokenDocuments are sorted be direction and spacingAngle * tokenDocuments.length <= 360
  */
  function calcFacingGroups(tokenDocuments, spacingAngle) {
    let d = tokenDocuments
      .map((v) => getTokenDirection(v))
      .reduce(
        (m, v) => {
          m.data[v] = m.data[v] ?? { count: 0 };
          m.data[v].count++;
          if (m.data[v].count === 1) {
            m.last = v > m.last ? v : m.last + spacingAngle;
            m.data[v].start = m.last;
          } else {
            m.last = m.last + spacingAngle;
          }
          return m;
        },
        { data: {}, last: -spacingAngle },
      );
    if (d.last >= 360) {
      let last = d.last - 360;
      Object.values(d.data).forEach((v) => {
        v.start = v.start > last ? v.start : last + spacingAngle;
        last = v.start + (v.count - 1) * spacingAngle;
        v.start = v.start % 360;
      });
    }
    return d.data;
  }

  const shiftLength = game.settings.get(MODULE_ID, 'tokenShiftDistance') ?? 0.4;
  const noShift = { x: 0, y: 0 };
  const standardShift = { x: 0, y: shiftLength * canvas.grid.sizeY };

  // Helper: apply shift flags, using socket for tokens we don't own
  function applyShiftFlags(updates) {
    const ownUpdates = [];
    const remoteUpdates = [];
    for (const u of updates) {
      if (u.tokenDoc.isOwner) {
        ownUpdates.push(u);
      } else {
        remoteUpdates.push({ tokenId: u.tokenDoc.id, flags: u.flags });
      }
    }
    for (const u of ownUpdates) {
      u.tokenDoc.update({ flags: u.flags });
    }
    if (remoteUpdates.length > 0) {
      game.socket.emit(`module.${MODULE_ID}`, {
        type: 'applyShift',
        sceneId: canvas.scene.id,
        updates: remoteUpdates,
      });
    }
  }

  if (tokenDocuments.length === 0) {
    return;
  }
  if (tokenDocuments.length === 1) {
    const shiftData = { shift: noShift, shiftAngle: 0, shiftDist: 0 };
    tokenDocuments[0].gurpsGridless = foundry.utils.mergeObject(tokenDocuments[0].gurpsGridless ?? {}, shiftData);
    doBorder(tokenDocuments[0].object);
    applyShiftFlags([{
      tokenDoc: tokenDocuments[0],
      flags: { [MODULE_ID]: { shift: noShift, shiftAngle: 0, shiftDist: 0 } },
    }]);
  } else {
    tokenDocuments.sort((a, b) => getTokenDirection(a) - getTokenDirection(b));
    let spacingAngle = 360 / Math.max(tokenDocuments.length, 6);
    let groups = calcFacingGroups(tokenDocuments, spacingAngle);
    let last;
    let i = 0;
    const updates = [];
    tokenDocuments.forEach((element) => {
      const dir = getTokenDirection(element);
      i = dir !== last ? 0 : i + 1;
      let shiftDir = groups[dir].start + i * spacingAngle;
      let rot = shiftDir - dir;
      const shift = rotatePoint(standardShift, rot);
      const shiftDist = shiftLength * canvas.grid.sizeY;
      element.gurpsGridless = foundry.utils.mergeObject(element.gurpsGridless ?? {}, {
        shift: shift,
        shiftAngle: rot,
        shiftDist: shiftDist,
      });
      doBorder(element.object);
      updates.push({
        tokenDoc: element,
        flags: { [MODULE_ID]: { shift, shiftAngle: rot, shiftDist } },
      });
      last = dir;
    });
    applyShiftFlags(updates);
  }
}

function applyCloseRangeShift(tokenDocument, updates, initial) {
  if (!isHexGrid() || !(game.settings.get(MODULE_ID, 'shiftTokensinSameHex') ?? false)) {
    return;
  }
  const { x: oldX, y: oldY } = tokenDocument;
  const { x: updateX, y: updateY } = updates;
  const newX = updateX ?? oldX;
  const newY = updateY ?? oldY;
  if (newY === oldY && newX === oldX && !initial) return;

  const oldTokensInRange = tokensInCloseRange(tokenDocument);
  calculateShift2(oldTokensInRange, (d) => normalizeAngle(getDirection(d.object)));

  const newTokensInRange = tokensInCloseRangeAt(tokenDocument, newX, newY);
  calculateShift2(newTokensInRange, (d) =>
    normalizeAngle(d.uuid === tokenDocument.uuid ? updates.rotation ?? tokenDocument.rotation : getDirection(d.object)),
  );
}

const version = '0.7.0';

// Initialize module
Hooks.once('init', async () => {
  console.log('gurps-gridless | Initializing gurps-gridless');

  game.gurpsGridLess = new GURPSGridLess();

  registerSettings();

  addTokenConfigTab(foundry.applications.sheets.TokenConfig);
  addTokenConfigTab(foundry.applications.sheets.PrototypeTokenConfig);

  game.modules.get(MODULE_ID).api = gurpsGridlessAPI;

  Hooks.callAll('gurpsGridlessReady', game.modules.get(MODULE_ID).api);
});

// Register socket listener for GM to apply shift updates on tokens players can't edit
Hooks.once('ready', async () => {
  // Register socket listener — GM applies shift flags on tokens players can't edit
  game.socket.on(`module.${MODULE_ID}`, async (data) => {
    if (data.type === 'applyShift' && game.user.isGM) {
      const scene = game.scenes.get(data.sceneId);
      if (!scene) return;
      for (const { tokenId, flags } of data.updates) {
        const tokenDoc = scene.tokens.get(tokenId);
        if (tokenDoc) await tokenDoc.update({ flags });
      }
    }
  });

  const oldVersion = game.settings.get(MODULE_ID, 'version') ?? '0.0.0';
  if (foundry.utils.isNewerVersion(version, oldVersion)) {
    foundry.applications.api.DialogV2.prompt({
      window: { title: 'New Version: Tools for Gridless GURPS' },
      content:
        '<p>Version 0.7.0 of Tools for Gridless GURPS</p><p>Hex Borders on hex grids with proper GURPS movement for multi hex tokens.</p><p>The new features need do be activated in the settings, because they will alter token behavior and setup in alle scenes.</p>',
      modal: true,
    });
    game.settings.set(MODULE_ID, 'version', version);
  }
});

Hooks.on('renderTokenConfig', (app, form, data) => modifyTokenConfig(app, form, data));
Hooks.on('renderPrototypeTokenConfig', (app, form, data) => modifyTokenConfig(app, form, data));

Hooks.on('refreshToken', (token) => {
  drawHitArea(token);
  doBorder(token);
  updateIndicatorDirection(token);
});

Hooks.on('preUpdateToken', (d, c, o) => {
  clipRotationToFaces(d, c);
  setTokenDimensionsOnUpdate(d, c, o);
  applyCloseRangeShift(d, c);
  game.gurpsGridLess.showRangeIndicator = false;
  game.gurpsGridLess.showRangeIndicatorAll = false;
  drawEachReachIndicator();
});

Hooks.on('drawToken', (token) => {
  setTokenDimensions$1(token.document);
  applyCloseRangeShift(token.document, {}, true);
  drawHitArea(token);
  drawIndicator(token);
});

Hooks.on('updateToken', (tokenDocument, changes) => {
  // Sync in-memory gurpsGridless from flags when shift data is updated (for other clients)
  if (changes.flags?.[MODULE_ID]?.shift !== undefined) {
    tokenDocument.gurpsGridless = foundry.utils.mergeObject(tokenDocument.gurpsGridless ?? {}, {
      shift: changes.flags[MODULE_ID].shift,
      shiftAngle: changes.flags[MODULE_ID].shiftAngle ?? 0,
      shiftDist: changes.flags[MODULE_ID].shiftDist ?? 0,
    });
  }
  drawHitArea(tokenDocument.object);
  doBorder(tokenDocument.object);
  updateIndicator(tokenDocument, changes);
});

Hooks.on('updateScene', updateSceneTokens);

Hooks.on('preCreateToken', setTokenDimensionsOnCreate);

Hooks.on('preMoveToken', (d, c) => {
  if (game.gurpsGridLess.suppressRotationOnMove) {
    c.autoRotate = false;
  }
});

Hooks.on('getSceneControlButtons', createToggleRotationButton);
//# sourceMappingURL=gurps-gridless.js.map
