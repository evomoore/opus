import { NextResponse } from 'next/server';

// Example static categories. Replace with your own or fetch from a database.
const categories = [
  'News',
  'Opinion',
  'Tutorial',
  'Review',
  'Interview',
  'Feature',
];

export async function GET() {
  return NextResponse.json(categories);
} 