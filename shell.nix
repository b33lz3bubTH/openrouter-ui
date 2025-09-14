{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs_20
    yarn
    nodePackages.npm
    openssl
    pkg-config
    libuuid
    prisma-engines
    chromium
  ];

  # Set environment variables for Prisma
  PRISMA_SCHEMA_ENGINE_BINARY = "${pkgs.prisma-engines}/bin/schema-engine";
  PRISMA_QUERY_ENGINE_BINARY = "${pkgs.prisma-engines}/bin/query-engine";
  PRISMA_QUERY_ENGINE_LIBRARY = "${pkgs.prisma-engines}/lib/libquery_engine.so.node";
  PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING = "1";
  PUPPETEER_SKIP_DOWNLOAD = "1";

  PUPPETEER_EXECUTABLE_PATH = "${pkgs.chromium}/bin/chromium" ;
  # Ensure OpenSSL and other libraries are available
  shellHook = ''
    echo "Node.js and Prisma development environment"
    echo "Node.js version: $(node --version)"
    echo "npm version: $(npm --version)"
    echo "yarn version: $(yarn --version)"
    echo "OpenSSL version: $(openssl version)"
    echo "Prisma engines: ${pkgs.prisma-engines}/bin"
    export PATH=$PWD/node_modules/.bin:$PATH
    export LD_LIBRARY_PATH=${pkgs.lib.makeLibraryPath [
      pkgs.openssl
      pkgs.libuuid
      pkgs.zlib
    ]}:$LD_LIBRARY_PATH

    export PUPPETEER_EXECUTABLE_PATH=${pkgs.chromium}/bin/chromium

    # Create a directory for Prisma engines if needed
    mkdir -p .prisma/engines
    # Symlink Prisma engines to avoid download
    ln -sf ${pkgs.prisma-engines}/bin/query-engine .prisma/engines/query-engine
    ln -sf ${pkgs.prisma-engines}/bin/schema-engine .prisma/engines/schema-engine
    ln -sf ${pkgs.prisma-engines}/lib/libquery_engine.so.node .prisma/engines/libquery_engine.so.node
  '';
}

