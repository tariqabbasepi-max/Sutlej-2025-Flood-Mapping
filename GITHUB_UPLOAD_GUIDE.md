# Uploading this repository on GitHub — Ubuntu 26.04 and Conda/JupyterLab

This guide assumes your existing working project is at:
`~/Documents/Sutlej_2025_FloodMapping_Reproducibility`

The new **public-shareable copy** should live separately at:
`~/Documents/Sutlej-2025-Flood-Mapping`

Do not rename or disturb the existing 75-file working project.

## A. Prepare and verify a new copy locally

1. Download and unzip the archive from ChatGPT into `~/Documents/`.
2. Open a Terminal in Ubuntu. To use your existing `gee` environment:

```bash
conda activate gee
cd ~/Documents/Sutlej-2025-Flood-Mapping
python tools/collect_project_files.py --source ~/Documents/Sutlej_2025_FloodMapping_Reproducibility --dry-run
python tools/collect_project_files.py --source ~/Documents/Sutlej_2025_FloodMapping_Reproducibility
python tools/preflight.py
bash tools/capture_environment.sh
```

The script **copies** expected files and preserves your original. It excludes `04_Manuscript_and_Submission/` and interview records. Option: add `--include-figures` to the copy command if you also want to include all the selected manuscript and supplementary image outputs. The standard notebook and GEE code are already included in the template. If you want to use the latest *local* versions instead, run the copy command with `--use-local-code` after reviewing the differences.

**Important:** if preflight reports missing files or large files, fix those before publication; GitHub will not magically obtain missing local data. If a raster or table is missing, rerun the original notebook on its inputs and compare the results before resuming.

## B. Check large GeoTIFFs

GitHub warns about ordinary Git files exceeding 50 MiB and rejects those exceeding 100 MiB. If `preflight.py` reports raster files larger than the GitHub limit, prepare Git LFS **before adding them to Git**, or deposit large datasets in a separate archival repository and link to it. For LFS on Ubuntu:

```bash
sudo apt update
sudo apt install git git-lfs
git lfs install
git lfs track "*.tif"
git lfs track "*.tiff"
```

The tracking commands create/update `.gitattributes`; remember to include that file in your Git commit. **LFS has its own usage quotas.** If you use a public data archive instead, document that archive's dataset URL/DOI clearly in the README and availability statement. If all binaries are small enough, Git LFS may not be necessary.

## C. Create a GitHub repository

1. Sign in to GitHub in your web browser.
2. Click **New repository** (often on your repositories page).
3. Name it `Sutlej-2025-Flood-Mapping`.
4. Choose **Public**, only after verifying the files are appropriate for public release.
5. **Do not** initialize it with a separate GitHub README, license or `.gitignore`, because this package already contains the intended files.
6. Click **Create repository**.

## D. Upload from the Ubuntu terminal

In the folder that contains the README:

```bash
cd ~/Documents/Sutlej-2025-Flood-Mapping
git init
git add .
git commit -m "Initial reproducibility package for Sutlej 2025 pilot"
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/Sutlej-2025-Flood-Mapping.git
git push -u origin main
```

Replace `<YOUR_GITHUB_USERNAME>` with your *actual* GitHub username (not your Ubuntu username, unless they happen to be identical). GitHub normally requires a supported authentication method such as a credential manager, GitHub CLI login, or a personal access token instead of your account password for HTTPS pushes.

If Git asks who you are, set an author name/email using `git config --global user.name "Your Name"` and `git config --global user.email "your-public-or-github-noreply-email"`. Avoid accidentally exposing a personal email address if you want it private.

## E. Verify the repository in a browser

1. Open the published URL and confirm the README displays.
2. Click both code files and check that they appear correctly.
3. Check the **complete validation shapefile** (all five parts), six input raster names, required output rasters, validation CSVs and the metadata.
4. Check each uploaded file has its intended size / downloadable content. If using LFS, verify that LFS downloads work.
5. Confirm you can clone to a new folder, locate and open the notebook from its root, and identify any remaining missing assets.
6. Tag a release such as `v1.0.0` only after validation. Consider an archived DOI (for example through Zenodo) for durable manuscript citation.

Do not state that data, code, and outputs are publicly available until step E succeeds. Your GitHub repository link is not created by downloading the package from ChatGPT.
