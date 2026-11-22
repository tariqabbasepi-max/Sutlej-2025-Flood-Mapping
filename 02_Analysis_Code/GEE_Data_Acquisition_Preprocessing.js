// ============================================================================
// PUNJAB 2025 | SENTINEL-1 VV + SENTINEL-2 RGB + NDFI
// Research test window: 20 x 20 km, UTM Zone 42N, exactly 10 m export grid.
// Dry: 01 May - 30 Jun 2025. Wet: 01 Sep - 30 Sep 2025.
// Original S1 dry/wet VV workflow retained; its export is now disabled.
// S2 dry/wet RGB displayed; their exports are disabled.
// ONLY ACTIVE EXPORTS: dry NDFI and wet NDFI as separate 20 m GeoTIFFs.
// NO flood classification, thresholds, or synthetic gap filling.
//
// Inspired by Simon Gascoin's CESBIO example (2016), with one important
// enhancement: stitch SAME-DAY adjacent slices, THEN take a temporal median.
// A single mosaic() over an entire season would NOT produce a median.
// ============================================================================

// 1. EXACT COMPUTATIONAL WINDOW AND 10 m OUTPUT GRID -------------------------
var point = ee.Geometry.Point([71.64512962312928, 29.44328740700825]);
var CRS = 'EPSG:32642';
var WEST = 746580;
var EAST = 766580;
var SOUTH = 3250010;
var NORTH = 3270010;
var GRID = [10, 0, WEST, 0, -10, NORTH];
var GRID20 = [20, 0, WEST, 0, -20, NORTH]; // 1000 x 1000; aligned to GRID
var AOI = ee.Geometry.Rectangle([WEST, SOUTH, EAST, NORTH], CRS, false);

Map.setOptions('SATELLITE');
Map.centerObject(AOI, 11);

// 2. USER SETTINGS -----------------------------------------------------------
// GEE filterDate() uses an EXCLUSIVE end date.
var DRY_START = '2025-05-01';
var DRY_END   = '2025-07-01';
var WET_START = '2025-09-01';
var WET_END   = '2025-10-01';

var PASS = 'DESCENDING';
var PLATFORM = 'A';           // Keep the same satellite in both seasons.
var FORCE_ORBIT = null;      // null = find highest paired-coverage relative orbit.
var SMOOTH_RADIUS_M = 30;    // Spatial median in meters. Set 100 for the French
                              // example's radius; 30 better preserves small features.
var MIN_PAIRED_COVERAGE = 0.98; // Do not export if >2% lacks paired measurements.

// 3. LOAD HOMOGENEOUS, ALREADY PREPROCESSED SENTINEL-1 GRD --------------------
// Earth Engine's S1_GRD collection has orbit files, thermal noise removal,
// radiometric calibration, and terrain correction already applied; VV is dB.
// Do NOT repeat those operations or erase 60 m from each scene's edge.
var S1 = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterBounds(AOI)
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .filter(ee.Filter.eq('resolution_meters', 10))
  .filter(ee.Filter.eq('platform_number', PLATFORM))
  .filter(ee.Filter.eq('orbitProperties_pass', PASS))
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
  .select('VV');

var dryCandidates = S1.filterDate(DRY_START, DRY_END);
var wetCandidates = S1.filterDate(WET_START, WET_END);
print('Dry source scene count', dryCandidates.size());
print('Wet source scene count', wetCandidates.size());
print('Dry relative orbits', dryCandidates.aggregate_histogram('relativeOrbitNumber_start'));
print('Wet relative orbits', wetCandidates.aggregate_histogram('relativeOrbitNumber_start'));

// 4. MOSAIC ADJACENT SLICES FROM EACH ACQUISITION DAY -------------------------
// Scenes are already limited to one platform, pass and relative orbit.
// A separate same-day mosaic is made for each date; different dates are NEVER
// stitched into one patchwork. This avoids counting adjacent slices as
// independent observations when creating the seasonal median.
function mosaicByDay(collection) {
  var tagged = collection.map(function(img) {
    return img.set('day', ee.Date(img.get('system:time_start')).format('YYYY-MM-dd'));
  });
  var days = ee.List(tagged.aggregate_array('day')).distinct().sort();
  return ee.ImageCollection.fromImages(days.map(function(day) {
    day = ee.String(day);
    var slices = tagged.filter(ee.Filter.eq('day', day))
      .sort('system:time_start');
    return slices.mosaic().select('VV')
      .set('day', day)
      .set('slice_count', slices.size())
      .set('system:time_start', ee.Date(day).millis());
  }));
}

// 5. TEMPORAL MEDIAN FOLLOWED BY GENTLE SPECKLE SMOOTHING --------------------
// Median and smoothing operate BEFORE the final clip to AOI.
// Set the composite's 10 m projection BEFORE using a meter-based focal filter.
function seasonalVV(sameDayMosaics, bandName) {
  var median = sameDayMosaics.median().select('VV')
    .setDefaultProjection(CRS, GRID);
  var result = median;
  if (SMOOTH_RADIUS_M > 0) {
    result = median.focal_median({
      radius: SMOOTH_RADIUS_M, kernelType: 'circle', units: 'meters'
    }).updateMask(median.mask());  // Never fill a masked gap from neighbors.
  }
  return result.rename(bandName).toFloat().clip(AOI);
}

// 6. COVERAGE DIAGNOSTICS (CONSOLE ONLY; NO EXTRA MAP LAYERS) -----------------
function validFraction(validImage) {
  var zeroOne = ee.Image(validImage).unmask(0, false).rename('valid');
  return ee.Number(zeroOne.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: AOI,
    crs: CRS,
    crsTransform: GRID,
    maxPixels: 1e8,
    tileScale: 4
  }).get('valid'));
}

// Outline is PAINTED as a line, not shown as a filled yellow polygon.
var outline = ee.Image().byte().paint(
  ee.FeatureCollection([ee.Feature(AOI)]), 1, 2
).selfMask();

function makeComposites(selectedOrbit) {
  var dryScenes = dryCandidates.filter(
    ee.Filter.eq('relativeOrbitNumber_start', selectedOrbit));
  var wetScenes = wetCandidates.filter(
    ee.Filter.eq('relativeOrbitNumber_start', selectedOrbit));

  var dryDays = mosaicByDay(dryScenes);
  var wetDays = mosaicByDay(wetScenes);
  print('Selected satellite / pass / relative orbit',
        'Sentinel-1' + PLATFORM, PASS, selectedOrbit);
  print('Dry mosaic dates', dryDays.aggregate_array('day'));
  print('Wet mosaic dates', wetDays.aggregate_array('day'));
  print('Dry slices per date', dryDays.aggregate_array('slice_count'));
  print('Wet slices per date', wetDays.aggregate_array('slice_count'));

  var dry = seasonalVV(dryDays, 'Dry_VV');
  var wet = seasonalVV(wetDays, 'Wet_VV');
  var dryValid = dryDays.count().gt(0);
  var wetValid = wetDays.count().gt(0);
  var pairValid = dryValid.and(wetValid)
    .and(dry.mask().unmask(0)).and(wet.mask().unmask(0));

  // Both export bands use the same valid-data mask and the SAME 10 m grid.
  // Do not export a backscatter value where a season has no observation.
  var output = dry.addBands(wet).updateMask(pairValid).toFloat();

  // Preserve the original VV map layers; add S2 RGB/NDFI layers below.
  var vvVis = {min: -25, max: 0, palette: ['000000', 'FFFFFF']};
  Map.addLayer(dry, vvVis, 'VV Dry - median', false);
  Map.addLayer(wet, vvVis, 'VV Wet - median', false);
  Map.addLayer(outline, {palette: ['FFFF00']}, 'Computational window', true);

  print('Dry valid coverage (%)', validFraction(dryValid).multiply(100));
  print('Wet valid coverage (%)', validFraction(wetValid).multiply(100));
  var coverage = validFraction(pairValid);
  print('Valid in BOTH dry and wet (%)', coverage.multiply(100));
  // TABLE 1 PROVENANCE: console-only diagnostics, no change to calculations.
  print('TABLE 1 | SENTINEL-1 ACQUISITION METADATA', ee.Dictionary({
    'Satellite': 'Sentinel-1' + PLATFORM,
    'Pass': PASS,
    'Relative orbit number': selectedOrbit,
    'Dry acquisition dates': dryDays.aggregate_array('day'),
    'Wet acquisition dates': wetDays.aggregate_array('day'),
    'Dry acquisition-date count': dryDays.size(),
    'Wet acquisition-date count': wetDays.size(),
    'Dry source scene/slice count': dryScenes.size(),
    'Wet source scene/slice count': wetScenes.size(),
    'Paired valid coverage (%)': coverage.multiply(100),
    'Meets 98% minimum paired coverage': coverage.gte(MIN_PAIRED_COVERAGE)
  }));
  print('Export bands', output.bandNames());
  print('Export grid: EPSG:32642, 10 m, 2000 x 2000 pixels');

  // Create export only when coverage is adequate. This avoids silently
  // exporting the partly covered rectangle from the earlier attempt.
  coverage.evaluate(function(value, error) {
    if (error || value === null || value === undefined) {
      print('ERROR: Could not evaluate coverage', error); return;
    }
    if (value < MIN_PAIRED_COVERAGE) {
      print('STOP: Only ' + (100 * value).toFixed(2) +
        '% paired coverage. This relative orbit does not adequately cover ' +
        'the entire test window. Mosaicking cannot reconstruct missing radar ' +
        'observations. Try another orbit/pass or extend the acquisition dates.');
      return;
    }
    if (value < 0.99999) {
      print('CAUTION: ' + (100 * (1 - value)).toFixed(2) +
        '% of pixels remain masked (no invented values).');
    }
    // ALREADY EXPORTED: retain this exactly as an optional, DISABLED export.
    // var name = 'Punjab2025_S1VV_DryWet_MosaicMedian_20km_10m';
    // Export.image.toDrive({
    //   image: output,
    //   description: name,
    //   folder: 'SAR_Experiment',
    //   fileNamePrefix: name,
    //   region: AOI,
    //   crs: CRS,
    //   crsTransform: GRID,
    //   maxPixels: 1e9,
    //   fileFormat: 'GeoTIFF'
    // });
    print('VV export DISABLED (previously exported); layers are available.');
  });
}

// 7. SELECT MATCHING ORBIT WITH MAXIMUM SHARED RAW COVERAGE -------------------
// Do not blindly combine ascending with descending or different relative
// orbits: different viewing geometries can introduce changes unrelated to flood.
var dryOrbitHist = dryCandidates.aggregate_histogram('relativeOrbitNumber_start');
var wetOrbitHist = wetCandidates.aggregate_histogram('relativeOrbitNumber_start');

dryOrbitHist.evaluate(function(dh, de) {
  if (de || !dh) { print('STOP: Dry metadata unavailable', de); return; }
  wetOrbitHist.evaluate(function(wh, we) {
    if (we || !wh) { print('STOP: Wet metadata unavailable', we); return; }
    var common = Object.keys(dh).filter(function(key) {
      return Object.prototype.hasOwnProperty.call(wh, key) &&
        (FORCE_ORBIT === null || Number(key) === Number(FORCE_ORBIT));
    });
    if (!common.length) {
      print('STOP: No common relative orbit for these dates, pass and satellite.');
      return;
    }
    var table = ee.FeatureCollection(common.map(function(key) {
      var orbit = Number(key);
      var d = dryCandidates.filter(
        ee.Filter.eq('relativeOrbitNumber_start', orbit));
      var w = wetCandidates.filter(
        ee.Filter.eq('relativeOrbitNumber_start', orbit));
      var both = d.count().gt(0).and(w.count().gt(0));
      return ee.Feature(null, {
        orbit: orbit,
        paired_coverage: validFraction(both),
        dry_scenes: dh[key],
        wet_scenes: wh[key]
      });
    }));
    table.evaluate(function(fc, err) {
      if (err || !fc || !fc.features || !fc.features.length) {
        print('STOP: Could not assess candidate orbit coverage', err); return;
      }
      var rows = fc.features.map(function(f) { return f.properties; });
      rows.sort(function(a, b) {
        return b.paired_coverage - a.paired_coverage ||
          Math.min(b.dry_scenes, b.wet_scenes) -
          Math.min(a.dry_scenes, a.wet_scenes) || a.orbit - b.orbit;
      });
      print('Candidate orbits ranked by RAW paired coverage', rows);
      makeComposites(rows[0].orbit);
    });
  });
});

// 8. SENTINEL-2 SURFACE-REFLECTANCE PREPROCESSING ------------------------------
// Same 20 x 20 km AOI and dry/wet date windows as Sentinel-1 above.
// Earth Engine's harmonized S2 L2A dataset has scaled surface reflectance;
// the harmonization already handles the post-2022 baseline DN shift.
// Scale B2/B3/B4/B12 by 0.0001 BEFORE seasonal median and NDFI arithmetic.
// SCL-based masking preserves water (SCL=6), masks cloud/shadow/cirrus,
// snow/ice, invalid pixels, and unclassified/low-confidence pixels (SCL=7).
// Do NOT use the supplied older QA60 example: its gte(0) checks always pass.
function maskAndScaleS2(img) {
  var scl = img.select('SCL');
  var clear = scl.neq(0)  // no data
    .and(scl.neq(1))     // saturated / defective
    .and(scl.neq(3))     // cloud shadow
    .and(scl.neq(7))     // unclassified / low-confidence cloud
    .and(scl.neq(8))     // medium-probability cloud
    .and(scl.neq(9))     // high-probability cloud
    .and(scl.neq(10))    // thin cirrus
    .and(scl.neq(11));   // snow / ice

  return img.select(['B2', 'B3', 'B4', 'B12'])
    .multiply(0.0001)
    .updateMask(clear)
    .toFloat()
    .copyProperties(img, ['system:time_start', 'system:index']);
}

var S2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(AOI)
  .filterDate(DRY_START, WET_END)
  .map(maskAndScaleS2);

var s2DryScenes = S2.filterDate(DRY_START, DRY_END);
var s2WetScenes = S2.filterDate(WET_START, WET_END);
print('S2 dry source-granule count', s2DryScenes.size());
print('S2 wet source-granule count', s2WetScenes.size());
// TABLE 1 PROVENANCE: scenes/granules in each analysis period.
// Counts are granules (assets), not necessarily distinct acquisition days.
function acquisitionDays(scenes) {
  return ee.List(scenes.aggregate_array('system:time_start'))
    .map(function(t) { return ee.Date(t).format('YYYY-MM-dd'); })
    .distinct().sort();
}
print('TABLE 1 | SENTINEL-2 ACQUISITION METADATA', ee.Dictionary({
  'Collection': 'COPERNICUS/S2_SR_HARMONIZED',
  'Dry granule count': s2DryScenes.size(),
  'Wet granule count': s2WetScenes.size(),
  'Dry unique acquisition days': acquisitionDays(s2DryScenes),
  'Wet unique acquisition days': acquisitionDays(s2WetScenes)
}));
print('S2 dry acquisition dates', s2DryScenes.aggregate_array('system:time_start'));
print('S2 wet acquisition dates', s2WetScenes.aggregate_array('system:time_start'));

// 9. OPTICAL SEASONAL MEDIANS AND RGB DISPLAY ---------------------------------
// Spectral-band temporal medians are computed separately at each grid pixel.
// No threshold is applied to the median reflectance or to the NDFI image.
var s2DryMedian = s2DryScenes.median().clip(AOI);
var s2WetMedian = s2WetScenes.median().clip(AOI);

// RGB is displayed at 10 m; NDFI applies an independent 20 m projection.
var dryRGB = s2DryMedian.select(['B4', 'B3', 'B2'])
  .setDefaultProjection(CRS, GRID);
var wetRGB = s2WetMedian.select(['B4', 'B3', 'B2'])
  .setDefaultProjection(CRS, GRID);
var rgbVis = {bands: ['B4', 'B3', 'B2'], min: 0.0, max: 0.3, gamma: 1.1};
Map.addLayer(dryRGB, rgbVis, 'Sentinel-2 RGB Dry - cloud masked median', false);
Map.addLayer(wetRGB, rgbVis, 'Sentinel-2 RGB Wet - cloud masked median', false);

// These RGB exports are intentionally DISABLED because they were already done.
// Export.image.toDrive({
//   image: dryRGB.toFloat(),
//   description: 'Punjab2025_S2_RGB_Dry_10m',
//   folder: 'SAR_Experiment',
//   fileNamePrefix: 'Punjab2025_S2_RGB_Dry_10m',
//   region: AOI, crs: CRS, crsTransform: GRID,
//   maxPixels: 1e9, fileFormat: 'GeoTIFF'
// });
// Export.image.toDrive({
//   image: wetRGB.toFloat(),
//   description: 'Punjab2025_S2_RGB_Wet_10m',
//   folder: 'SAR_Experiment',
//   fileNamePrefix: 'Punjab2025_S2_RGB_Wet_10m',
//   region: AOI, crs: CRS, crsTransform: GRID,
//   maxPixels: 1e9, fileFormat: 'GeoTIFF'
// });

// 10. NDFI AT 20 METRES -------------------------------------------------------
// User-provided formula: NDFI = (Red - SWIR2) / (Red + SWIR2).
// B4 (red) has native 10 m pixels; B12 (SWIR2) has native 20 m pixels.
// We aggregate the seasonally median B4 from 10 m to 20 m using area-weighted
// mean (rather than claiming a 10 m NDFI by upsampling 20 m SWIR2).
// Use the same EPSG:32642, origin-aligned 20 m grid for both seasons.
function makeNDFI(s2Median, bandName) {
  var red20 = s2Median.select('B4')
    .setDefaultProjection(CRS, GRID)
    .reduceResolution({reducer: ee.Reducer.mean(), maxPixels: 16})
    .reproject({crs: CRS, crsTransform: GRID20});

  // B12 already originates at 20 m; request it on the exact export grid.
  var swir20 = s2Median.select('B12')
    .setDefaultProjection(CRS, GRID20)
    .reproject({crs: CRS, crsTransform: GRID20});

  // The expression operates on reflectance, not unscaled integer DN values.
  var denominator = red20.add(swir20);
  return ee.Image().expression(
      '(red - swir2) / (red + swir2)',
      {red: red20, swir2: swir20}
    )
    .updateMask(denominator.neq(0))
    .rename(bandName)
    .toFloat()
    .clip(AOI);
}

var dryNDFI = makeNDFI(s2DryMedian, 'NDFI_Dry');
var wetNDFI = makeNDFI(s2WetMedian, 'NDFI_Wet');

// Display continuous, UNTHRESHOLDED NDFI values; color palette only.
var ndfiVis = {
  min: -0.6, max: 0.6,
  palette: ['8c510a', 'f6e8c3', 'f5f5f5', 'c7eae5', '01665e']
};
Map.addLayer(dryNDFI, ndfiVis, 'NDFI Dry (20 m, unthresholded)', false);
Map.addLayer(wetNDFI, ndfiVis, 'NDFI Wet (20 m, unthresholded)', true);

function validFraction20(validImage) {
  var zeroOne = ee.Image(validImage).unmask(0, false).rename('valid');
  return ee.Number(zeroOne.reduceRegion({
    reducer: ee.Reducer.mean(), geometry: AOI,
    crs: CRS, crsTransform: GRID20, maxPixels: 1e8, tileScale: 4
  }).get('valid'));
}
print('S2 NDFI Dry valid coverage (%)',
      validFraction20(dryNDFI.mask()).multiply(100));
print('S2 NDFI Wet valid coverage (%)',
      validFraction20(wetNDFI.mask()).multiply(100));
print('S2 NDFI in BOTH seasons valid coverage (%)',
      validFraction20(dryNDFI.mask().and(wetNDFI.mask())).multiply(100));
print('NDFI export grid: EPSG:32642, 20 m, 1000 x 1000 pixels');

// 11. ONLY ACTIVE EXPORT TASKS: TWO SINGLE-BAND NDFI GEOTIFFS -----------------
// Cloud-obscured / missing pixels remain masked; no synthetic gap filling.
// Exporting creates tasks; run both manually in the Earth Engine Tasks tab.
Export.image.toDrive({
  image: dryNDFI,
  description: 'Punjab2025_S2_NDFI_Dry_20m',
  folder: 'SAR_Experiment',
  fileNamePrefix: 'Punjab2025_S2_NDFI_Dry_20m',
  region: AOI,
  crs: CRS,
  crsTransform: GRID20,
  maxPixels: 1e9,
  fileFormat: 'GeoTIFF'
});

Export.image.toDrive({
  image: wetNDFI,
  description: 'Punjab2025_S2_NDFI_Wet_20m',
  folder: 'SAR_Experiment',
  fileNamePrefix: 'Punjab2025_S2_NDFI_Wet_20m',
  region: AOI,
  crs: CRS,
  crsTransform: GRID20,
  maxPixels: 1e9,
  fileFormat: 'GeoTIFF'
});

print('READY: Two active Tasks > Run exports: NDFI Dry and NDFI Wet.');
