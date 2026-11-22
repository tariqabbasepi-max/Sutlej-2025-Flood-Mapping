#!/usr/bin/env python3
"""Copy a whitelisted selection of research files into a GitHub-ready project copy.

The script never deletes originals, never uploads data, and deliberately omits
manuscript/reviewer correspondence and QGIS .qmd metadata. The uploaded original
source codes are already in the template and are not overwritten by default.
"""
import argparse
import csv
import hashlib
import shutil
import sys
from pathlib import Path

DEFAULT_SOURCE = Path.home() / 'Documents' / 'Sutlej_2025_FloodMapping_Reproducibility'
DEST = Path(__file__).resolve().parents[1]
SHP = 'Validation_Points_2025'
REQUIRED = [
    *(f'01_Analysis_Input_Data/Reference_Data/{SHP}.{ext}' for ext in ('shp','shx','dbf','prj','cpg')),
    '01_Analysis_Input_Data/Sentinel_1_SAR/S1_VV_Dry_MayJun_2025_10m.tif',
    '01_Analysis_Input_Data/Sentinel_1_SAR/S1_VV_Wet_Sep_2025_10m.tif',
    '01_Analysis_Input_Data/Sentinel_2_Optical/S2_NDFI_Dry_MayJun_2025_20m.tif',
    '01_Analysis_Input_Data/Sentinel_2_Optical/S2_NDFI_Wet_Sep_2025_20m.tif',
    '01_Analysis_Input_Data/Sentinel_2_Optical/S2_RGB_Dry_MayJun_2025_10m.tif',
    '01_Analysis_Input_Data/Sentinel_2_Optical/S2_RGB_Wet_Sep_2025_10m.tif',
]
EXPECTED_RASTERS = [
    'Sutlej2025_NDFI_DryWet_Transitions4Class_20m.tif',
    'Sutlej2025_NDFI_WetMinusDry_Continuous_20m.tif',
    'Sutlej2025_NDFI_WetWater_20m.tif',
    'Sutlej2025_OpticalNewWater_AND_WetSAR_StrictCandidate_20m.tif',
    'Sutlej2025_OpticalNewWater_WetSAR_Evidence4Class_20m.tif',
    'Sutlej2025_SAR_WetWater_GMM_SLIC_GraphCut_10m.tif',
    'Sutlej2025_WetSAR_WetNDFI_Fusion4Class_20m.tif',
    'Sutlej2025_WetVV_GMM_SLIC_GraphCut_Water_20m.tif',
]
REQUIRED += [f'03_Analysis_Outputs/01_Rasters/{name}' for name in EXPECTED_RASTERS]
CODE = [
    '02_Analysis_Code/GEE_Data_Acquisition_Preprocessing.js',
    '02_Analysis_Code/Sutlej2025_GMM_SLIC_GraphCut_v2.1_TIFF600.ipynb',
]
COLLECT_FOLDERS = {
    '03_Analysis_Outputs/03_Tables': {'.csv', '.json'},
    '03_Analysis_Outputs/04_Validation': {'.csv'},
    '03_Analysis_Outputs/05_Sensitivity': {'.csv'},
    '03_Analysis_Outputs/06_Reproducibility': {'.csv', '.json'},
    '03_Analysis_Outputs/07_Publication_Ready/Tables': {'.csv'},
}
FIG_FOLDERS = [
    '03_Analysis_Outputs/02_Figures',
    '03_Analysis_Outputs/07_Publication_Ready/Manuscript',
    '03_Analysis_Outputs/07_Publication_Ready/Supplementary',
]

def sha256_file(path):
    h = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(8 * 1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--source', type=Path, default=DEFAULT_SOURCE)
    ap.add_argument('--destination', type=Path, default=DEST)
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--include-figures', action='store_true')
    ap.add_argument('--use-local-code', action='store_true', help='Replace template code with local source versions')
    args = ap.parse_args()
    src = args.source.expanduser().resolve()
    dst = args.destination.expanduser().resolve()
    if src == dst or dst == src or src in dst.parents or dst in src.parents:
        sys.exit('ERROR: source and destination must be separate, non-nested project folders.')
    if not src.is_dir():
        sys.exit(f'ERROR: source folder not found: {src}')
    if not (src/'01_Analysis_Input_Data').is_dir():
        sys.exit(f'ERROR: not the expected Sutlej analysis project: {src}')
    entries = set(REQUIRED)
    if args.use_local_code:
        entries.update(CODE)
    for name, extensions in COLLECT_FOLDERS.items():
        directory = src/name
        if directory.is_dir():
            for candidate in directory.rglob('*'):
                if candidate.is_file() and candidate.suffix.lower() in extensions:
                    entries.add(candidate.relative_to(src).as_posix())
    if args.include_figures:
        for folder in FIG_FOLDERS:
            directory = src/folder
            if directory.is_dir():
                for candidate in directory.rglob('*'):
                    if candidate.is_file() and candidate.suffix.lower() in ('.tif', '.tiff'):
                        entries.add(candidate.relative_to(src).as_posix())
    rows = []
    missing = []
    for rel in sorted(entries):
        frm = src/rel
        to = dst/rel
        if not frm.is_file():
            status = 'MISSING'
            missing.append(rel)
            size = ''
            checksum = ''
        else:
            size = frm.stat().st_size
            status = 'WOULD_COPY' if args.dry_run else 'COPIED'
            checksum = ''
            if not args.dry_run:
                to.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(frm, to)
                checksum = sha256_file(to)
        rows.append(dict(path=rel, status=status, bytes=size, sha256=checksum))
        print(f'{status:11} {rel}' + (f' [{size / 1024**2:.2f} MiB]' if size != '' else ''))
    if not args.dry_run:
        with (dst/'COLLECTION_REPORT.csv').open('w', newline='', encoding='utf-8') as stream:
            writer = csv.DictWriter(stream, fieldnames=['path','status','bytes','sha256'])
            writer.writeheader()
            writer.writerows(rows)
    print(f'\nExpected/present: {len(entries) - len(missing)}/{len(entries)}; missing: {len(missing)}')
    if missing:
        print('WARNING: The publication copy is not complete. Fix missing files before claiming full availability.')
    if not args.dry_run:
        print('Next: python tools/preflight.py')
    return 2 if missing else 0

if __name__ == '__main__':
    sys.exit(main())
