#!/usr/bin/env bash
# Regenerate the typed ABI modules in src/contracts/abis/ from the Foundry
# artifacts in <repo>/out. Run `forge build` first, then this script.
#
#   ./scripts/gen-abis.sh
#
# Requires: jq. The hand-written ERC-20 ABI (abis/Erc20.ts) is left untouched.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # UI/web
repo="$(cd "$here/../.." && pwd)"                          # repo root
out="$repo/out"
dest="$here/src/contracts/abis"

mkdir -p "$dest"

# export name (camelCase) -> Foundry contract artifact name
declare -A MAP=(
  [wineLotToken]=WineLotToken
  [primaryMarket]=PrimaryMarket
  [secondaryMarket]=SecondaryMarket
  [redemptionManager]=RedemptionManager
  [identityRegistry]=IdentityRegistry
  [trustedIssuersRegistry]=TrustedIssuersRegistry
  [claimIssuer]=ClaimIssuer
  [roleGateway]=RoleGateway
)

index="$dest/index.ts"
{
  echo "// Auto-generated from Foundry artifacts (out/). Do not edit by hand."
  echo "// Regenerate after \`forge build\` with ./scripts/gen-abis.sh"
  echo ""
} > "$index"

for name in "${!MAP[@]}"; do
  c="${MAP[$name]}"
  abi="$(jq -c '.abi' "$out/$c.sol/$c.json")"
  {
    echo "// Auto-generated from out/${c}.sol/${c}.json — do not edit by hand."
    printf 'export const %sAbi = %s as const;\n' "$name" "$abi"
  } > "$dest/${c}.ts"
  echo "export { ${name}Abi } from './${c}';" >> "$index"
done

echo "Regenerated $(ls "$dest"/*.ts | wc -l) ABI modules in $dest"
