# Computational Reproducibility Verification

## Study
Sutlej 2025 Sentinel-1/Sentinel-2 flood-mapping pilot study.

## Test date
22 November 2026

## Test configuration
The analysis notebook was executed in a separate local clone of
the research repository to protect the original research files
and the GitHub publication copy.

Execution environment:
- Conda environment: gee
- Python: 3.13.13
- NumPy: 2.5.3
- scikit-learn: 1.9.1
- scikit-image: 0.26.0
- PyMaxflow: 1.3.2
- Rasterio: 1.5.1

## Notebook execution
- Total code cells: 25
- Nonempty code cells executed: 24
- Empty code cells: 1
- Recorded execution errors: 0

The notebook completed execution through Jupyter nbconvert.

## Scientific output verification
- Tracked files in scientific output directories: 46
- Scientific output files: 39
- Directory placeholders (.gitkeep): 7
- Scientific files with post-checkout modification timestamps: 39
- Scientific files differing from committed versions: 0
- New untracked scientific output files: 0

The modification timestamps are consistent with regeneration of all
39 scientific output files. Git comparisons confirmed that their
contents matched the committed versions byte-for-byte.

## Limitations
This test demonstrates repeatability using the existing local
Conda environment and the supplied repository inputs.

It does not establish:
- Successful installation in a clean software environment.
- Independent reproduction on another computer.
- Independent field validation of the satellite-derived results.

Changes to provenance metadata and output manifests during execution
were not treated as discrepancies in scientific outputs.
