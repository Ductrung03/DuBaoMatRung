#!/usr/bin/env python3
"""
Fix PostgreSQL 17 SQL dump for PostgreSQL 15 compatibility
Processes file line by line to avoid memory issues
"""

import sys
import re

def fix_sql_file(input_file, output_file):
    """Fix SQL file for PostgreSQL 15 compatibility"""

    # Patterns to remove (incompatible with PG15)
    remove_patterns = [
        r'^SET transaction_timeout\s*=.*$',
        r'^SET row_security\s*=.*$',
        r'^SET xmloption\s*=.*$',
    ]

    compiled_patterns = [re.compile(p) for p in remove_patterns]

    lines_removed = 0
    lines_processed = 0

    print("Processing SQL file for PostgreSQL 15 compatibility...")
    print(f"Input:  {input_file}")
    print(f"Output: {output_file}")

    with open(input_file, 'r', encoding='utf-8') as infile:
        with open(output_file, 'w', encoding='utf-8') as outfile:
            for line in infile:
                lines_processed += 1

                # Check if line should be removed
                should_remove = False
                for pattern in compiled_patterns:
                    if pattern.match(line):
                        should_remove = True
                        lines_removed += 1
                        break

                # Write line if not removed
                if not should_remove:
                    outfile.write(line)

                # Progress indicator
                if lines_processed % 10000 == 0:
                    print(f"  Processed: {lines_processed:,} lines ({lines_removed:,} removed)")

    print(f"\nCompleted!")
    print(f"  Total lines processed: {lines_processed:,}")
    print(f"  Lines removed: {lines_removed:,}")
    print(f"  Output file: {output_file}")

if __name__ == "__main__":
    input_file = "docker-init/admin-postgis/01-admin-db.sql"
    output_file = "docker-init/admin-postgis/01-admin-db-pg15.sql"

    try:
        fix_sql_file(input_file, output_file)
        print("\n✓ Success! File is ready for PostgreSQL 15")
    except Exception as e:
        print(f"\n✗ Error: {e}")
        sys.exit(1)
