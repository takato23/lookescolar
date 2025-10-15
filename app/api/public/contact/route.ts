import { NextResponse } from 'next/server';
import { getAppSettings } from '@/lib/settings';

const FALLBACK_CONTACT = {
  email: 'hola@lookescolar.com',
  phone: '+54 9 11 2345-6789',
  whatsappUrl:
    'https://wa.me/5491123456789?text=Hola%20LookEscolar%2C%20necesito%20ayuda%20con%20mi%20galer%C3%ADa',
};

function buildWhatsappUrl(phone: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D+/g, '');
  if (!digits) return null;
  const base = digits.startsWith('549') ? digits : `54${digits}`;
  const message =
    'Hola%20LookEscolar%2C%20necesito%20ayuda%20para%20acceder%20a%20mi%20galer%C3%ADa';
  return `https://wa.me/${base}?text=${message}`;
}

export async function GET() {
  try {
    const settings = await getAppSettings();
    const email = settings.businessEmail ?? FALLBACK_CONTACT.email;
    const phone = settings.businessPhone ?? FALLBACK_CONTACT.phone;
    const whatsappUrl =
      buildWhatsappUrl(settings.businessPhone ?? '') ??
      FALLBACK_CONTACT.whatsappUrl;

    return NextResponse.json({
      email,
      phone,
      whatsappUrl,
    });
  } catch (error) {
    console.warn('[Contact API] Falling back to default contact info', error);
    return NextResponse.json(FALLBACK_CONTACT);
  }
}
