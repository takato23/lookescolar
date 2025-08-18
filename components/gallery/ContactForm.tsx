'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ContactFormProps {
  eventName: string;
  schoolName: string;
  totalPhotos: number;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  message: string;
  interestedPhotos: string;
}

export function ContactForm({
  eventName,
  schoolName,
  totalPhotos,
}: ContactFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    message: '',
    interestedPhotos: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(
    null
  );

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const generateEmailBody = () => {
    const galleryUrl = window.location.href;
    return `Hola Melisa,

Vi las fotos del evento "${eventName}" en ${schoolName} y me interesan algunas.

Mis datos de contacto:
- Nombre: ${formData.name}
- Email: ${formData.email}
- Teléfono: ${formData.phone}

${formData.interestedPhotos ? `Fotos que me interesan: ${formData.interestedPhotos}` : ''}

${formData.message ? `Mensaje adicional: ${formData.message}` : ''}

Link de la galería: ${galleryUrl}

¡Espero tu respuesta para coordinar la entrega!

Saludos.`;
  };

  const generateWhatsAppMessage = () => {
    return `Hola Melisa! Vi las fotos del evento "${eventName}" y me interesan algunas. Mi nombre es ${formData.name} ${formData.phone ? `(${formData.phone})` : ''}. ¿Podríamos coordinar? ${window.location.href}`;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const emailBody = generateEmailBody();
      const emailUrl = `mailto:melisa@lookescolar.com?subject=Interés en fotos del evento "${eventName}"&body=${encodeURIComponent(emailBody)}`;

      window.open(emailUrl);
      setSubmitStatus('success');

      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          name: '',
          email: '',
          phone: '',
          message: '',
          interestedPhotos: '',
        });
        setShowForm(false);
        setSubmitStatus(null);
      }, 2000);
    } catch (error) {
      console.error('Error sending email:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppContact = () => {
    const message = generateWhatsAppMessage();
    const whatsappUrl = `https://wa.me/541234567890?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (submitStatus === 'success') {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <span className="text-2xl text-green-600">✓</span>
        </div>
        <h3 className="mb-2 text-xl font-semibold text-green-800">
          ¡Perfecto!
        </h3>
        <p className="text-green-700">
          Se abrió tu cliente de email con toda la información. Melisa te
          responderá a la brevedad.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="contacto">
      {/* Quick contact buttons */}
      <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-8 text-center shadow-lg">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-4 text-3xl font-bold text-gray-900">
            ¿Te gustaron las fotos? 📸
          </h2>
          <p className="mb-6 text-lg text-gray-700">
            Contacta con Melisa para obtener las fotos originales en alta
            calidad, sin marca de agua y listas para imprimir.
          </p>

          <div className="mb-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              onClick={handleWhatsAppContact}
              className="inline-flex items-center justify-center rounded-lg bg-green-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
              aria-label="Contactar por WhatsApp"
            >
              <span className="mr-2">💬</span>
              Escribir por WhatsApp
            </Button>

            <Button
              onClick={() => setShowForm(!showForm)}
              variant="outline"
              className="inline-flex items-center justify-center rounded-lg border-indigo-300 px-6 py-3 font-semibold text-indigo-700 transition-colors hover:bg-indigo-50"
              aria-label={showForm ? 'Ocultar formulario de contacto' : 'Mostrar formulario de contacto'}
            >
              <span className="mr-2">📧</span>
              {showForm ? 'Ocultar formulario' : 'Enviar Email detallado'}
            </Button>
          </div>

          <div className="text-sm text-gray-600">
            <p>
              📍 {schoolName} • 📊 {totalPhotos} fotos disponibles
            </p>
          </div>
        </div>
      </div>

      {/* Detailed contact form */}
      {showForm && (
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-xl">
          <div className="mx-auto max-w-2xl">
            <div className="mb-6 text-center">
              <h3 className="mb-2 text-2xl font-bold text-gray-800">
                Formulario de Contacto
              </h3>
              <p className="text-gray-600">
                Completa tus datos para que Melisa pueda contactarte sobre las
                fotos
              </p>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="name"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                    placeholder="Tu nombre y apellido"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                    placeholder="tu@email.com"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Teléfono
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 transition-colors focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                  placeholder="+54 9 11 1234-5678"
                />
              </div>

              <div>
                <label
                  htmlFor="interestedPhotos"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Fotos que te interesan
                </label>
                <input
                  type="text"
                  id="interestedPhotos"
                  name="interestedPhotos"
                  value={formData.interestedPhotos}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 transition-colors focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
                  placeholder="Ej: Fotos 5, 12, 25-30, todas las del grupo, etc."
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Mensaje adicional
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  placeholder="Cualquier información adicional, preferencias de entrega, etc."
                />
              </div>

              <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.name || !formData.email}
                  className="flex-1 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Enviar formulario de contacto"
                >
                  {isSubmitting ? (
                    <>
                      <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">📧</span>
                      Enviar Email
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  onClick={() => setShowForm(false)}
                  variant="outline"
                  className="rounded-lg px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  aria-label="Cancelar formulario"
                >
                  Cancelar
                </Button>
              </div>

              {submitStatus === 'error' && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  Hubo un error al procesar tu solicitud. Por favor, intenta
                  nuevamente o usa WhatsApp.
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
