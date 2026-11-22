# Sutlej 2025 floodplain — Sentinel-1 / Sentinel-2 candidate-water mapping

**Reproducibility materials for:** *Supporting livestock disaster preparedness with Sentinel-1 and Sentinel-2: candidate inundation in the 2025 Sutlej floodplain* (major-revision research package).

This repository is designed to share the **analysis input rasters, image-interpreted validation points, Google Earth Engine (GEE) preprocessing script, Python/Jupyter notebook, candidate-water mapping outputs, validation and sensitivity tables, and provenance** from a **20 × 20 km (400 km²) pilot study** in the Sutlej floodplain near Bahawalpur, Pakistan.

> **Repository Status: Research Reproducibility Package**
>
> This repository contains the Sentinel-1 and Sentinel-2 input rasters, 400 image-interpreted validation points, Google Earth Engine preprocessing code, Python/Jupyter analysis notebook, classification outputs, validation results, sensitivity analyses, and reproducibility documentation for the 2025 Sutlej floodplain pilot study.
>
> The methodology was quantitatively evaluated using 400 image-interpreted reference points, cross-sensor agreement analysis, and parameter-sensitivity testing. Independent field validation and province-wide implementation remain outside the scope of this study.
## Study scope and interpretation

- Analysis periods: dry May–June 2025; wet September 2025.
- Computational window: EPSG:32642, easting 746580–766580, northing 3250010–3270010 (20 × 20 km).
- Wet-season Sentinel-1 VV candidate-water mapping: scene-fitted two-component Gaussian mixture model (GMM), SLIC superpixels and graph-cut regularization.
- Optical Sentinel-2 NDFI: `(Red − SWIR2) / (Red + SWIR2)`; dry–wet changes and co-occurrence with wet-season SAR candidate water.
- The 400 points are **manually image-interpreted Sentinel-2 RGB labels**, deliberately balanced between classes—not independent field ground truth or a probability sample. Cross-sensor consistency does not demonstrate mapped-flood accuracy.
- This is a local 2025 candidate-water screening analysis, **not a validated Punjab-wide inundation map or confirmed flood extent**.

## Folder guide

| Path | Purpose |
| --- | --- |
| `01_Analysis_Input_Data/Sentinel_1_SAR/` | Two dry/wet Sentinel-1 VV input GeoTIFFs, 10 m |
| `01_Analysis_Input_Data/Sentinel_2_Optical/` | Four dry/wet Sentinel-2 NDFI (20 m) and RGB (10 m) GeoTIFFs |
| `01_Analysis_Input_Data/Reference_Data/` | `Validation_Points_2025` shapefile, including `.shp`, `.shx`, `.dbf`, `.prj`, `.cpg` |
| `02_Analysis_Code/` | GEE JavaScript and v2.1 Python/Jupyter analysis notebook |
| `03_Analysis_Outputs/01_Rasters/` | Eight derived mapping GeoTIFFs |
| `03_Analysis_Outputs/03_Tables/` | Main and supplementary machine-readable tables |
| `03_Analysis_Outputs/04_Validation/` | Reference comparison and confusion matrix CSVs |
| `03_Analysis_Outputs/05_Sensitivity/` | SAR and NDFI sensitivity CSVs |
| `03_Analysis_Outputs/06_Reproducibility/` | Input inventory, analysis provenance, output manifest |
| `03_Analysis_Outputs/07_Publication_Ready/Tables/` | Selected publication tables (CSV) |
| `tools/` | Local data collection and GitHub-size preflight scripts |

The publication figures are included in this repository.  The manuscript, cover letter, reviewer response, and any interview records are intentionally excluded.

## Running the analysis

Activate the existing Conda environment from the repository root:

1. Run `conda activate gee`.
2. Run `python3 tools/preflight.py`.
3. Run `jupyter lab --ServerApp.root_dir="$PWD"`.

Open the notebook in `02_Analysis_Code/` and execute its cells in order.

The supplied environment file is not an exact version lockfile.
Use `bash tools/capture_environment.sh` to record your tested environment.

### Portable paths

The uploaded notebook *already* identifies the project root by walking up from Jupyter's current directory until it finds `01_Analysis_Input_Data` and `02_Analysis_Code`. It also supports the optional `SUTLEJ_PROJECT_DIR` environment variable. **No hard-coded `/home/<username>` path is needed** if the directory structure is preserved and Jupyter launches in or below the project root. For example, the image-interpreted point layer is loaded as:

`01_Analysis_Input_Data/Reference_Data/Validation_Points_2025.shp`

Preserve *all* five conventional shapefile components with the same basename. Do not accidentally upload only `.shp`.

## Google Earth Engine preprocessing

1. Open the GEE Code Editor with a suitably authorized account.
2. Paste `02_Analysis_Code/GEE_Data_Acquisition_Preprocessing.js` and review collection filtering, spatial reference, and dates.
3. **Currently only the two separate NDFI GeoTIFF exports are enabled.** SAR and RGB exports are intentionally commented out because they were exported previously in the source workflow. To reproduce those files from GEE, review and deliberately re-enable/adjust the relevant exports rather than assuming the two NDFI tasks produce all six inputs.
4. Run any desired export tasks in the Earth Engine **Tasks** tab. The downloaded files must be named and placed according to `DATA_DICTIONARY.md`. The original script's GEE Drive export basenames differ from the project input filenames.

**GEE exports are not produced by GitHub itself.** The JavaScript references public GEE collections, and its export tasks require a GEE user account, quotas and potentially manual steps.

## Repository contents and verification

This repository contains the six satellite input rasters,
the validation-point shapefile, analysis code, classification
rasters, evaluation tables, sensitivity results, publication
figures, and reproducibility records.

Run `python3 tools/preflight.py` to verify essential file presence.

The preflight check does not establish that an independent
scientific rerun has succeeded.

## GitHub upload and publication

Read **`GITHUB_UPLOAD_GUIDE.md`** for the exact beginner-friendly commands. **Confirm data sharing rights and inspect validation point attributes before making the repository public.** Standard GitHub files larger than **100 MiB** are rejected, and those over **50 MiB** trigger warnings; inspect `tools/preflight.py` before pushing. Large TIFFs may need Git LFS or a linked, versioned research-data archive. See [GitHub large-file documentation](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github).

Only after successfully publishing the full agreed dataset, code, and output files should you insert the final public link or a release DOI in the manuscript. An example wording is in `MANUSCRIPT_AVAILABILITY.md`.

## Reproducibility limitations

- Analysis inputs and code are provided.
- An independent clean-environment rerun has not yet been documented.
- Software versions and Earth Engine processing conditions may affect results.
- SAR and RGB exports require additional GEE export steps.
- The environment specification is not an exact dependency lockfile.
- Image-interpreted reference points are not independent field observations.

## Citation and licensing

Use `CITATION.cff` as the initial software citation metadata (check the manuscript author order and final release details). No automatic code/data redistribution license has been assigned; see `LICENSING_NOTES.md` for decisions required before public sharing. Public Sentinel source-data terms and attribution should be reviewed separately from permissions to publish the manually interpreted validation points.
