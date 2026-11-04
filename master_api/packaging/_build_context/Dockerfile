# ============================================================================
# CIMS Packaging Build - Multi-stage Docker Build
# Produces a .deb package with compiled backend + built frontend
# ============================================================================

# ── Stage 1: Build the Frontend ─────────────────────────────────────────────
FROM node:20-bookworm AS frontend-builder

WORKDIR /build/frontend
COPY frontend/ .

RUN npm ci --legacy-peer-deps --no-audit --no-fund && \
    npm run build

# ── Stage 2: Compile the Backend with Nuitka ────────────────────────────────
FROM python:3.11-bookworm AS backend-builder

# Install system deps for Nuitka compilation + psycopg2 + opencv
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    patchelf \
    ccache \
    libpq-dev \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build/backend

# Install Python dependencies first (layer cache)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Pin lazy_loader to fix a known Nuitka crash with skimage
RUN pip install --no-cache-dir nuitka ordered-set zstandard lazy_loader==0.3

# Copy the application source
COPY backend/app/ ./app/
COPY backend/alembic/ ./alembic/
COPY backend/alembic.ini .
COPY packaging/entrypoint.py ./entrypoint.py

# Compile with Nuitka into a standalone directory
# We use --standalone (not --onefile) for better compatibility,
# then tar the result for inclusion in the .deb
RUN python -m nuitka \
    --standalone \
    --output-filename=cims-backend \
    --include-package=app \
    --include-package=uvicorn \
    --include-package=uvicorn.lifespan \
    --include-package=uvicorn.loops \
    --include-package=uvicorn.protocols \
    --include-package=passlib \
    --include-package=passlib.handlers \
    --include-package=passlib.handlers.bcrypt \
    --include-data-dir=alembic=alembic \
    --include-data-file=alembic.ini=alembic.ini \
    --assume-yes-for-downloads \
    entrypoint.py \
    && mv entrypoint.dist cims-backend-dist

# ── Stage 3: Assemble the .deb Package ─────────────────────────────────────
FROM debian:bookworm-slim AS packager

ARG VERSION=1.0.0
ARG PACKAGE_NAME=cims

WORKDIR /build/deb

# Create the .deb directory structure
RUN mkdir -p \
    ${PACKAGE_NAME}_${VERSION}/DEBIAN \
    ${PACKAGE_NAME}_${VERSION}/opt/cims/bin \
    ${PACKAGE_NAME}_${VERSION}/opt/cims/frontend \
    ${PACKAGE_NAME}_${VERSION}/opt/cims/uploads \
    ${PACKAGE_NAME}_${VERSION}/etc/cims \
    ${PACKAGE_NAME}_${VERSION}/etc/nginx/sites-available \
    ${PACKAGE_NAME}_${VERSION}/lib/systemd/system

# Copy the compiled backend (standalone directory)
COPY --from=backend-builder /build/backend/cims-backend-dist/ \
    ${PACKAGE_NAME}_${VERSION}/opt/cims/bin/

# Copy the built frontend
COPY --from=frontend-builder /build/frontend/dist/ \
    ${PACKAGE_NAME}_${VERSION}/opt/cims/frontend/

# Copy packaging files
COPY packaging/debian/ ${PACKAGE_NAME}_${VERSION}/DEBIAN/
COPY packaging/config/cims.env ${PACKAGE_NAME}_${VERSION}/etc/cims/cims.env
COPY packaging/config/nginx-cims.conf ${PACKAGE_NAME}_${VERSION}/etc/nginx/sites-available/cims
COPY packaging/systemd/cims-backend.service ${PACKAGE_NAME}_${VERSION}/lib/systemd/system/

# Substitute version in control file
RUN sed -i "s/__VERSION__/${VERSION}/g" ${PACKAGE_NAME}_${VERSION}/DEBIAN/control

# Fix line endings (Windows → Unix)
RUN apt-get update && apt-get install -y --no-install-recommends dos2unix && \
    find ${PACKAGE_NAME}_${VERSION}/DEBIAN -type f -exec dos2unix {} \; && \
    rm -rf /var/lib/apt/lists/*

# Set permissions
RUN chmod 755 ${PACKAGE_NAME}_${VERSION}/DEBIAN/postinst \
              ${PACKAGE_NAME}_${VERSION}/DEBIAN/prerm \
              ${PACKAGE_NAME}_${VERSION}/DEBIAN/postrm \
    && chmod 755 ${PACKAGE_NAME}_${VERSION}/opt/cims/bin/cims-backend \
    && chmod 600 ${PACKAGE_NAME}_${VERSION}/etc/cims/cims.env

# Build the .deb
RUN dpkg-deb --build --root-owner-group ${PACKAGE_NAME}_${VERSION}

# Move final artifact to /output
RUN mkdir -p /output && mv ${PACKAGE_NAME}_${VERSION}.deb /output/

# ── Final stage: copy out the .deb ──────────────────────────────────────────
FROM scratch AS export
COPY --from=packager /output/*.deb /
