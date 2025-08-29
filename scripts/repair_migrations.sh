#!/bin/bash
# Repair all existing migrations as applied to enable new hierarchical migrations

set -e

echo "Repairing migration history..."

# Mark all existing migrations as applied
supabase migration repair --status applied 001
supabase migration repair --status applied 002
supabase migration repair --status applied 003
supabase migration repair --status applied 004
supabase migration repair --status applied 005
supabase migration repair --status applied 006
supabase migration repair --status applied 007
supabase migration repair --status applied 008
supabase migration repair --status applied 009
supabase migration repair --status applied 010
supabase migration repair --status applied 011
supabase migration repair --status applied 012
supabase migration repair --status applied 013
supabase migration repair --status applied 014
supabase migration repair --status applied 015
supabase migration repair --status applied 016
supabase migration repair --status applied 017
supabase migration repair --status applied 018
supabase migration repair --status applied 020
supabase migration repair --status applied 030
supabase migration repair --status applied 20240106
supabase migration repair --status applied 20240108000003
supabase migration repair --status applied 20240116000002
supabase migration repair --status applied 20240116
supabase migration repair --status applied 20240315000000
supabase migration repair --status applied 20241225
supabase migration repair --status applied 20250107
supabase migration repair --status applied 20250108
supabase migration repair --status applied 20250109
supabase migration repair --status applied 20250110
supabase migration repair --status applied 20250121
supabase migration repair --status applied 20250122
supabase migration repair --status applied 20250123
supabase migration repair --status applied 20250124
supabase migration repair --status applied 20250822
supabase migration repair --status applied 20250823
supabase migration repair --status applied 20250825
supabase migration repair --status applied 20250826
supabase migration repair --status applied 20250827
supabase migration repair --status applied 20250828

echo "Migration repair completed!"