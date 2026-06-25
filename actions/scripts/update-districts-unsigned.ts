import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function removeVietnameseTones(str: string): string {
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  str = str.replace(/đ/g, 'd');
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, 'A');
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, 'E');
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, 'I');
  str = str.replace(/Ò|Ó|Ọ|Ỏ|õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, 'O');
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, 'U');
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, 'Y');
  str = str.replace(/Đ/g, 'D');
  return str;
}

function cleanDistrict(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  
  // Specific checks for corrupted characters or Vietnamese accented names
  if (lower.includes('đống đa') || lower.includes('dong da') || lower.includes('ng ??a') || lower.includes('????ng')) return 'Dong Da';
  if (lower.includes('cầu giấy') || lower.includes('cau giay') || lower.includes('c???u') || lower.includes('gi???y')) return 'Cau Giay';
  if (lower.includes('gia lâm') || lower.includes('gia lam') || lower.includes('l??m')) return 'Gia Lam';
  if (lower.includes('hoàn kiếm') || lower.includes('hoan kiem') || lower.includes('ho??n') || lower.includes('ki???m')) return 'Hoan Kiem';
  if (lower.includes('hai bà trưng') || lower.includes('hai ba trưng') || lower.includes('hai ba trung') || lower.includes('tr??ng')) return 'Hai Ba Trung';
  if (lower.includes('ba đình') || lower.includes('ba dinh') || lower.includes('????nh') || lower.startsWith('ba ??')) return 'Ba Dinh';
  if (lower.includes('tây hồ') || lower.includes('tay ho') || lower.includes('t??y') || lower.includes('h???')) return 'Tay Ho';
  
  return removeVietnameseTones(raw);
}

async function main() {
  console.log('🔄 Starting District Unsigned Update Process...');

  // 1. Update Places
  const places = await prisma.place.findMany({
    select: { id: true, name: true, district: true }
  });

  console.log(`🔍 Found ${places.length} places to process`);
  let placeUpdates = 0;

  for (const place of places) {
    const cleaned = cleanDistrict(place.district);
    if (cleaned && cleaned !== place.district) {
      await prisma.place.update({
        where: { id: place.id },
        data: { district: cleaned }
      });
      console.log(`  Updated place "${place.name}": "${place.district}" -> "${cleaned}"`);
      placeUpdates++;
    }
  }

  // 2. Update Trip Days
  const tripDays = await prisma.tripDay.findMany({
    select: { id: true, district: true }
  });

  console.log(`🔍 Found ${tripDays.length} trip days to process`);
  let tripDayUpdates = 0;

  for (const day of tripDays) {
    const cleaned = cleanDistrict(day.district);
    if (cleaned && cleaned !== day.district) {
      await prisma.tripDay.update({
        where: { id: day.id },
        data: { district: cleaned }
      });
      console.log(`  Updated TripDay ${day.id}: "${day.district}" -> "${cleaned}"`);
      tripDayUpdates++;
    }
  }

  console.log(`\n🎉 Process finished! Updated ${placeUpdates} places and ${tripDayUpdates} trip days.`);
}

main()
  .catch((e) => {
    console.error('❌ Error during update:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
