#!/usr/bin/env python3
"""Check that all essential data/code exist and identify large files before GitHub upload."""
import csv
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
CODE=[
 '02_Analysis_Code/GEE_Data_Acquisition_Preprocessing.js',
 '02_Analysis_Code/Sutlej2025_GMM_SLIC_GraphCut_v2.1_TIFF600.ipynb',
]
INPUT=[
 *(f'01_Analysis_Input_Data/Reference_Data/Validation_Points_2025.{ext}' for ext in ('shp','shx','dbf','prj','cpg')),
 '01_Analysis_Input_Data/Sentinel_1_SAR/S1_VV_Dry_MayJun_2025_10m.tif',
 '01_Analysis_Input_Data/Sentinel_1_SAR/S1_VV_Wet_Sep_2025_10m.tif',
 '01_Analysis_Input_Data/Sentinel_2_Optical/S2_NDFI_Dry_MayJun_2025_20m.tif',
 '01_Analysis_Input_Data/Sentinel_2_Optical/S2_NDFI_Wet_Sep_2025_20m.tif',
 '01_Analysis_Input_Data/Sentinel_2_Optical/S2_RGB_Dry_MayJun_2025_10m.tif',
 '01_Analysis_Input_Data/Sentinel_2_Optical/S2_RGB_Wet_Sep_2025_10m.tif',
]
RASTERS=[
 'Sutlej2025_NDFI_DryWet_Transitions4Class_20m.tif',
 'Sutlej2025_NDFI_WetMinusDry_Continuous_20m.tif',
 'Sutlej2025_NDFI_WetWater_20m.tif',
 'Sutlej2025_OpticalNewWater_AND_WetSAR_StrictCandidate_20m.tif',
 'Sutlej2025_OpticalNewWater_WetSAR_Evidence4Class_20m.tif',
 'Sutlej2025_SAR_WetWater_GMM_SLIC_GraphCut_10m.tif',
 'Sutlej2025_WetSAR_WetNDFI_Fusion4Class_20m.tif',
 'Sutlej2025_WetVV_GMM_SLIC_GraphCut_Water_20m.tif',
]
EXPECTED=CODE+INPUT+[f'03_Analysis_Outputs/01_Rasters/{f}' for f in RASTERS]
missing=[rel for rel in EXPECTED if not (ROOT/rel).is_file()]
if missing:
 print(f'INCOMPLETE: {len(missing)} expected code/input/output file(s) missing:')
 for m in missing:print('  ',m)
else:print(f'PASS: all {len(EXPECTED)} essential code/input/raster files found.')
important_dirs=['03_Analysis_Outputs/04_Validation','03_Analysis_Outputs/05_Sensitivity','03_Analysis_Outputs/06_Reproducibility','03_Analysis_Outputs/03_Tables']
for d in important_dirs:
 files=[p for p in (ROOT/d).rglob('*') if p.is_file() and p.name!='.gitkeep']
 print(f'{d}: {len(files)} data files')
 if not files: missing.append(d + ' (empty)')
file_rows=[]
for p in sorted(ROOT.rglob('*')):
 if not p.is_file():continue
 if any(t in p.parts for t in ('.git', '.ipynb_checkpoints')):continue
 size=p.stat().st_size
 file_rows.append((p.relative_to(ROOT).as_posix(), size))
large=[(name,size) for name,size in file_rows if size>50*1024*1024]
toobig=[(name,size) for name,size in file_rows if size>100*1024*1024]
print(f'Total files: {len(file_rows)}, combined size: {sum(s for _,s in file_rows)/1024**2:.1f} MiB')
for name,size in large:print(f'WARNING large file ({size/1024**2:.1f} MiB): {name}')
if toobig:print('STOP: Files over 100 MiB require Git LFS or an external data archive before a standard Git push.')
with (ROOT/'UPLOAD_SIZE_REPORT.csv').open('w', newline='', encoding='utf-8') as f:
 writer=csv.writer(f);writer.writerow(['path','bytes','mebibytes','greater_than_50_MiB','greater_than_100_MiB'])
 for name,size in file_rows:writer.writerow([name,size,round(size/1024**2,3),size>50*1024**2,size>100*1024**2])
if missing or toobig:
 print('NOT READY TO CLAIM COMPLETE PUBLIC AVAILABILITY.')
 sys.exit(2)
print('FILE PRESENCE & SIZE PASS. Still confirm sharing rights and test a fresh notebook run before publishing.')
