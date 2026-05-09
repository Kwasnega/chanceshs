import { NextResponse } from 'next/server';
import { rtdb } from '@/lib/firebase';
import { ref, set } from 'firebase/database';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const filePath = path.join(process.cwd(), 'src/assets/data/schooldata.xlsx');

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ 
      error: 'Excel file not found. Please place it at src/assets/data/schooldata.xlsx' 
    }, { status: 404 });
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const allSchools: any[] = [];
    const seenSchools = new Set();
    
    // This will track the category if a sheet doesn't have a category column
    let stickyCategory = 'C'; 

    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      // 1. Detect if this sheet defines a new global category in its titles
      for (let i = 0; i < Math.min(rows.length, 15); i++) {
        const rowStr = JSON.stringify(rows[i]).toUpperCase();
        if (rowStr.includes('CATEGORY A') || rowStr.includes('CATEGORY "A"')) stickyCategory = 'A';
        else if (rowStr.includes('CATEGORY B') || rowStr.includes('CATEGORY "B"')) stickyCategory = 'B';
        else if (rowStr.includes('CATEGORY C') || rowStr.includes('CATEGORY "C"')) stickyCategory = 'C';
        else if (rowStr.includes('CATEGORY D') || rowStr.includes('CATEGORY "D"')) stickyCategory = 'D';
      }

      // 2. Find the header row
      let headerRowIndex = -1;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row && row.length > 0) {
          const rowString = row.join(' ').toUpperCase();
          if (rowString.includes('NAME OF SCHOOL') || rowString.includes('SCHOOL NAME') || rowString.includes('NAMEOFSGHOOL')) {
            headerRowIndex = i;
            break;
          }
        }
      }

      if (headerRowIndex !== -1) {
        const rawHeaders = rows[headerRowIndex];
        const dataRows = rows.slice(headerRowIndex + 1);

        dataRows.forEach(row => {
          if (!row || row.length === 0) return;
          
          let name = '', category = '', region = 'Unknown', gender = 'Mixed', code = '', location = '', status = '';

          rawHeaders.forEach((h, idx) => {
            const header = String(h || '').toUpperCase();
            const val = row[idx];
            if (!val && header !== 'CATEGORY') return; // Category might be empty if it's the 11th column

            if (header.includes('NAME')) name = String(val).trim();
            else if (header.includes('CATEGORY')) category = String(val || '').trim();
            else if (header.includes('REGION')) region = String(val).trim();
            else if (header.includes('GENDER')) gender = String(val).trim();
            else if (header.includes('CODE')) code = String(val).trim();
            else if (header.includes('LOCATION')) location = String(val).trim();
            else if (header.includes('STATUS')) status = String(val).trim();
          });

          // 3. Smart Category Inference
          // If category was found in the row, use it. 
          // If the header was null but the column (usually index 10) has A/B/C/D, use it.
          if (!category && row[10] && /^[ABCD]$/.test(String(row[10]).trim())) {
            category = String(row[10]).trim();
          }
          
          // Fallback to the sticky category if still empty
          if (!category) {
            category = stickyCategory;
          }

          // Validation and De-duplication
          if (name && name.length > 2 && !seenSchools.has(name + region)) {
            seenSchools.add(name + region);
            allSchools.push({
              name,
              category: category.charAt(0).toUpperCase(), // Ensure it's just 'A', 'B', etc.
              region: region || 'Unknown',
              gender: gender || 'Mixed',
              code: code || '',
              location: location || '',
              status: status || '',
              id: (allSchools.length + 1).toString()
            });
          }
        });
      }
    });

    if (allSchools.length === 0) {
      return NextResponse.json({ error: 'No schools found.' }, { status: 400 });
    }

    const schoolsData: Record<string, any> = {};
    allSchools.forEach((school) => {
      schoolsData[school.id] = {
        ...school,
        historicalCutoffs: {
          '2023': school.category === 'A' ? 7 : (school.category === 'B' ? 14 : 28)
        }
      };
    });

    const schoolsRef = ref(rtdb, 'schools');
    await set(schoolsRef, schoolsData);

    return NextResponse.json({ 
      success: true,
      message: `Successfully seeded ${allSchools.length} schools with corrected categories!`,
      sampleA: allSchools.find(s => s.category === 'A'),
      sampleB: allSchools.find(s => s.category === 'B'),
      sampleC: allSchools.find(s => s.category === 'C'),
    });
  } catch (error: any) {
    console.error('Seeding error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
