// app/promoter/events/create/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EventCategory } from '@/types/database';
import { AIQuickBuildFlow } from '@/components/AIQuickBuildFlow';
import { TimePicker } from '@/components/ui/time-picker/TimePicker';

function to24Hour(time12: string): string {
  const match = time12.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return '';
  let h = parseInt(match[1], 10);
  const m = match[2];
  const period = match[3].toUpperCase();
  if (period === 'AM') { if (h === 12) h = 0; }
  else { if (h !== 12) h += 12; }
  return `${h.toString().padStart(2, '0')}:${m}`;
}

function to12Hour(time24: string): string {
  const match = time24.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '';
  let h = parseInt(match[1], 10);
  const m = match[2];
  const period = h < 12 ? 'AM' : 'PM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${period}`;
}

// Multi-step wizard steps
type WizardStep = 'basics' | 'details' | 'tickets' | 'image' | 'review';

const CATEGORY_CONFIG: Record<EventCategory, { icon: string; label: string }> = {
  nightlife: { icon: '🎉', label: 'Nightlife' },
  family: { icon: '👨‍👩‍👧‍👦', label: 'Family' },
  movies: { icon: '🎬', label: 'Movies' },
  dining: { icon: '🍽️', label: 'Dining' },
  arts: { icon: '🎨', label: 'Arts' },
  sports: { icon: '⚽', label: 'Sports' },
};

interface TicketType {
  name: string;
  price: number;
}

function CreateEventForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get('draft');

  // Mode selection: null = show mode picker, 'ai' = AI builder, 'manual' = existing wizard
  const [mode, setMode] = useState<'ai' | 'manual' | null>(draftId ? 'manual' : null);

  const [currentStep, setCurrentStep] = useState<WizardStep>('basics');
  const [loading, setLoading] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(!!draftId);
  const [venues, setVenues] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  // Form data
  const [formData, setFormData] = useState({
    // Basics
    name: '',
    category: 'nightlife' as EventCategory,
    event_date: '',
    event_time: '',
    
    // Details
    description: '',
    venue_id: '',
    custom_venue_name: '',
    custom_venue_address: '',
    
    // Tickets
    total_tickets: 100,
    ticket_types: [
      { name: 'General Admission', price: 25 },
    ] as TicketType[],
    sale_start_date: '',
    sale_end_date: '',
    
    // Image
    flyer_image: null as File | null,
    flyer_preview: '',

    // Group
    group_id: '' as string | null,
  });

  // Load venues on mount
  useEffect(() => {
    fetch('/api/v1/venues')
      .then(res => res.json())
      .then(data => setVenues(data.data || []));
    fetch('/api/v1/groups')
      .then(res => res.json())
      .then(data => setGroups(data.data || []));
  }, []);

  // Load existing draft if editing
  useEffect(() => {
    if (!draftId) return;

    setLoadingDraft(true);
    fetch(`/api/v1/promoter/events/draft/${draftId}`, { method: 'GET' })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          const draft = data.data;
          const eventDate = draft.event_date ? new Date(draft.event_date) : null;

          // Convert ticket_prices object back to ticket_types array
          const ticketTypes: TicketType[] = draft.ticket_prices
            ? Object.entries(draft.ticket_prices).map(([name, price]) => ({
                name: name.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
                price: price as number,
              }))
            : [{ name: 'General Admission', price: 25 }];

          setFormData(prev => ({
            ...prev,
            name: draft.name || '',
            category: draft.category || 'nightlife',
            event_date: eventDate ? eventDate.toISOString().split('T')[0] : '',
            event_time: eventDate ? eventDate.toTimeString().slice(0, 5) : '',
            description: draft.description || '',
            venue_id: draft.venue_id || '',
            custom_venue_name: draft.venue_name || '',
            custom_venue_address: '',
            total_tickets: draft.total_tickets || 100,
            ticket_types: ticketTypes,
            sale_start_date: draft.sale_start_date || '',
            sale_end_date: draft.sale_end_date || '',
            flyer_preview: draft.flyer_image_url || '',
          }));
        }
      })
      .catch(err => console.error('Failed to load draft:', err))
      .finally(() => setLoadingDraft(false));
  }, [draftId]);

  // Step navigation
  const steps: WizardStep[] = ['basics', 'details', 'tickets', 'image', 'review'];
  const stepIndex = steps.indexOf(currentStep);
  const progress = ((stepIndex + 1) / steps.length) * 100;

  const nextStep = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
      }

      setFormData({
        ...formData,
        flyer_image: file,
        flyer_preview: URL.createObjectURL(file),
      });
    }
  };

  // Add ticket type
  const addTicketType = () => {
    setFormData({
      ...formData,
      ticket_types: [
        ...formData.ticket_types,
        { name: '', price: 0 },
      ],
    });
  };

  // Remove ticket type
  const removeTicketType = (index: number) => {
    setFormData({
      ...formData,
      ticket_types: formData.ticket_types.filter((_, i) => i !== index),
    });
  };

  // Update ticket type
  const updateTicketType = (index: number, field: 'name' | 'price', value: string | number) => {
    const updated = [...formData.ticket_types];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, ticket_types: updated });
  };

  // Submit form
  const handleSubmit = async () => {
    setLoading(true);

    try {
      // 1. Upload image if exists
      let flyer_image_url = '';
      if (formData.flyer_image) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', formData.flyer_image);

        try {
          const uploadRes = await fetch('/api/v1/upload/flyer', {
            method: 'POST',
            body: uploadFormData,
          });

          if (!uploadRes.ok) {
            const errorData = await uploadRes.json().catch(() => ({}));
            console.error('Upload endpoint error:', uploadRes.status, errorData);
            throw new Error(errorData.error || `Upload failed (${uploadRes.status})`);
          }

          const uploadData = await uploadRes.json();
          if (!uploadData.success) {
            throw new Error(uploadData.error || 'Image upload failed');
          }
          flyer_image_url = uploadData.data?.url || uploadData.url || '';
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
          if (uploadError instanceof TypeError && uploadError.message.includes('fetch')) {
            // Network error - endpoint unreachable
            const skipImage = confirm('Image upload service unavailable. Continue without image?');
            if (!skipImage) {
              setLoading(false);
              return;
            }
          } else {
            throw uploadError;
          }
        }
      }

      // 2. Create event draft
      const eventData = {
        name: formData.name,
        category: formData.category,
        event_date: `${formData.event_date}T${formData.event_time}:00`,
        description: formData.description,
        venue_id: formData.venue_id || null,
        venue_name: formData.custom_venue_name || null,
        venue_address: formData.custom_venue_address || null,
        total_tickets: formData.total_tickets,
        ticket_prices: formData.ticket_types.reduce((acc, tt) => {
          acc[tt.name.toLowerCase().replace(/\s+/g, '_')] = tt.price;
          return acc;
        }, {} as Record<string, number>),
        sale_start_date: formData.sale_start_date,
        sale_end_date: formData.sale_end_date,
        flyer_image_url,
        group_id: formData.group_id || null,
        tier_discounts: {
          basic: 10,
          promoter: 15,
        },
      };

      let res;
      if (draftId) {
        // Update existing draft
        res = await fetch(`/api/v1/promoter/events/draft/${draftId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData),
        });
      } else {
        // Create new draft
        res = await fetch('/api/v1/promoter/events/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventData),
        });
      }

      const data = await res.json();

      if (data.success) {
        router.push('/promoter/dashboard?created=true');
      } else {
        alert(data.error || 'Failed to save event');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Mode picker screen
  if (!mode) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-10">
            <h1 className="text-4xl font-bold mb-2">Create Event</h1>
            <p className="text-[#7DD8E8]">How would you like to create your event?</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AI Quick Build */}
            <button
              onClick={() => setMode('ai')}
              className="p-8 bg-gradient-to-br from-[#59FFA0]/10 to-[#007BFF]/10 border-2 border-[#59FFA0]/40 rounded-2xl hover:border-[#59FFA0] transition-all text-left group"
            >
              <div className="text-5xl mb-4">✨</div>
              <h3 className="text-2xl font-bold text-white mb-2">AI Quick Build</h3>
              <p className="text-[#7DD8E8] mb-4">
                Tell AI your event details and get a complete package — titles, description,
                pricing, and a generated flyer background — in under 60 seconds.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#59FFA0] bg-[#59FFA0]/10 border border-[#59FFA0]/30 px-3 py-1 rounded-full">
                  Recommended
                </span>
                <span className="text-xs text-[#7DD8E8]">Fastest</span>
              </div>
            </button>

            {/* Manual Wizard */}
            <button
              onClick={() => setMode('manual')}
              className="p-8 bg-card border-2 border-border rounded-2xl hover:border-accent/50 transition-all text-left"
            >
              <div className="text-5xl mb-4">✏️</div>
              <h3 className="text-2xl font-bold text-white mb-2">Build Manually</h3>
              <p className="text-[#7DD8E8] mb-4">
                Fill out each detail yourself using the step-by-step wizard. Full control
                over every field from start to finish.
              </p>
              <div className="text-xs text-[#7DD8E8]">5-step wizard • Full control</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // AI Quick Build mode
  if (mode === 'ai') {
    return <AIQuickBuildFlow onBack={() => setMode(null)} />;
  }

  // Manual wizard mode
  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{draftId ? 'Edit Event Draft' : 'Create Event'}</h1>
          <p className="text-[#7DD8E8]">{draftId ? 'Update your draft and save changes' : 'Fill out the details below to list your event'}</p>
        </div>

        {loadingDraft && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#59FFA0] border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-[#7DD8E8]">Loading draft...</span>
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold capitalize">{currentStep.replace('_', ' ')}</span>
            <span className="text-sm text-[#7DD8E8]">Step {stepIndex + 1} of {steps.length}</span>
          </div>
          <div className="h-2 bg-secondary/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Form Steps */}
        <div className="bg-card border border-border rounded-2xl p-8 mb-6">
          {/* STEP 1: BASICS */}
          {currentStep === 'basics' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Event Basics</h2>

              {/* Event Name */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Event Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Saturday Night Dance Party"
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Category *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: key as EventCategory })}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.category === key
                          ? 'border-accent bg-accent/10'
                          : 'border-border hover:border-accent/50'
                      }`}
                    >
                      <div className="text-3xl mb-2">{config.icon}</div>
                      <div className="font-semibold text-sm">{config.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div>
                  <TimePicker
                    label="START TIME"
                    value={formData.event_time ? to12Hour(formData.event_time) : undefined}
                    onChange={(val) => setFormData({ ...formData, event_time: to24Hour(val) })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: DETAILS */}
          {currentStep === 'details' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Event Details</h2>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Description *
                </label>
                <textarea
                  required
                  rows={6}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your event... What can attendees expect? What makes it special?"
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-accent transition-colors resize-none"
                />
                <p className="text-xs text-[#7DD8E8] mt-1">
                  {formData.description.length} characters
                </p>
              </div>

              {/* Venue Selection */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Venue
                </label>
                <select
                  value={formData.venue_id}
                  onChange={(e) => setFormData({ ...formData, venue_id: e.target.value })}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-accent transition-colors"
                >
                  <option value="">Select existing venue or enter custom below</option>
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name} - {venue.address}
                    </option>
                  ))}
                </select>
              </div>

              {/* Exclusive Group */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Exclusive Group (optional)
                </label>
                <select
                  value={formData.group_id || ''}
                  onChange={(e) => setFormData({ ...formData, group_id: e.target.value || null })}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-accent transition-colors"
                >
                  <option value="">None (public event)</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[#7DD8E8] mt-1">
                  Selecting a group makes this event visible only to group members
                </p>
              </div>

              {/* Custom Venue */}
              {!formData.venue_id && (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Venue Name (if not listed above) *
                    </label>
                    <input
                      type="text"
                      value={formData.custom_venue_name}
                      onChange={(e) => setFormData({ ...formData, custom_venue_name: e.target.value })}
                      placeholder="The Underground Lounge"
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Venue Address *
                    </label>
                    <input
                      type="text"
                      value={formData.custom_venue_address}
                      onChange={(e) => setFormData({ ...formData, custom_venue_address: e.target.value })}
                      placeholder="123 Main St, Rochester, NY"
                      className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 3: TICKETS */}
          {currentStep === 'tickets' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Tickets & Pricing</h2>

              {/* Total Capacity */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Total Tickets Available *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={formData.total_tickets}
                  onChange={(e) => setFormData({ ...formData, total_tickets: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              {/* Ticket Types */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-semibold">
                    Ticket Types *
                  </label>
                  <button
                    type="button"
                    onClick={addTicketType}
                    className="text-sm text-accent hover:text-accent/80 font-semibold"
                  >
                    + Add Ticket Type
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.ticket_types.map((ticket, index) => (
                    <div key={index} className="flex gap-3">
                      <input
                        type="text"
                        required
                        placeholder="Ticket name (e.g., VIP, Early Bird)"
                        value={ticket.name}
                        onChange={(e) => updateTicketType(index, 'name', e.target.value)}
                        className="flex-1 px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-accent transition-colors"
                      />
                      <div className="flex items-center gap-2 px-4 py-3 bg-background border border-border rounded-xl">
                        <span className="text-[#7DD8E8]">$</span>
                        <input
                          type="number"
                          required
                          min={0}
                          step={0.01}
                          placeholder="0.00"
                          value={ticket.price || ''}
                          onChange={(e) => updateTicketType(index, 'price', parseFloat(e.target.value) || 0)}
                          className="w-20 bg-transparent focus:outline-none"
                        />
                      </div>
                      {formData.ticket_types.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTicketType(index)}
                          className="px-4 py-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Sale Dates */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Sale Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.sale_start_date}
                    onChange={(e) => setFormData({ ...formData, sale_start_date: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Sale End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.sale_end_date}
                    onChange={(e) => setFormData({ ...formData, sale_end_date: e.target.value })}
                    min={formData.event_date}
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: IMAGE */}
          {currentStep === 'image' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Event Flyer</h2>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Upload Event Flyer
                </label>
                <p className="text-sm text-[#7DD8E8] mb-4">
                  JPG or PNG, max 5MB. Recommended: 1080x1350px (4:5 ratio)
                </p>

                {/* Image Preview */}
                {formData.flyer_preview ? (
                  <div className="relative aspect-[4/5] max-w-md mx-auto rounded-2xl overflow-hidden mb-4">
                    <img
                      src={formData.flyer_preview}
                      alt="Flyer preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, flyer_image: null, flyer_preview: '' })}
                      className="absolute top-4 right-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="block aspect-[4/5] max-w-md mx-auto border-2 border-dashed border-border rounded-2xl hover:border-accent transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                      <div className="text-6xl mb-4">📸</div>
                      <div className="font-semibold mb-2">Click to upload flyer</div>
                      <div className="text-sm text-[#7DD8E8]">or drag and drop</div>
                    </div>
                  </label>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: REVIEW */}
          {currentStep === 'review' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6">Review & Submit</h2>

              <div className="space-y-4">
                {/* Basics */}
                <div className="p-4 bg-background rounded-xl">
                  <div className="text-sm font-semibold text-[#7DD8E8] mb-2">EVENT BASICS</div>
                  <div className="space-y-1">
                    <div><strong>Name:</strong> {formData.name}</div>
                    <div><strong>Category:</strong> {CATEGORY_CONFIG[formData.category].icon} {CATEGORY_CONFIG[formData.category].label}</div>
                    <div><strong>Date:</strong> {formData.event_date} at {formData.event_time}</div>
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 bg-background rounded-xl">
                  <div className="text-sm font-semibold text-[#7DD8E8] mb-2">DETAILS</div>
                  <div className="space-y-1">
                    <div><strong>Description:</strong></div>
                    <div className="text-sm text-[#7DD8E8]">{formData.description}</div>
                    <div className="mt-2">
                      <strong>Venue:</strong> {
                        formData.venue_id 
                          ? venues.find(v => v.id === formData.venue_id)?.name
                          : `${formData.custom_venue_name}, ${formData.custom_venue_address}`
                      }
                    </div>
                  </div>
                </div>

                {/* Tickets */}
                <div className="p-4 bg-background rounded-xl">
                  <div className="text-sm font-semibold text-[#7DD8E8] mb-2">TICKETS</div>
                  <div className="space-y-1">
                    <div><strong>Total Capacity:</strong> {formData.total_tickets} tickets</div>
                    <div><strong>Ticket Types:</strong></div>
                    <ul className="list-disc list-inside ml-4">
                      {formData.ticket_types.map((tt, i) => (
                        <li key={i}>{tt.name}: ${tt.price.toFixed(2)}</li>
                      ))}
                    </ul>
                    <div className="mt-2"><strong>Sale Period:</strong> {formData.sale_start_date} to {formData.sale_end_date}</div>
                  </div>
                </div>

                {/* Image */}
                {formData.flyer_preview && (
                  <div className="p-4 bg-background rounded-xl">
                    <div className="text-sm font-semibold text-[#7DD8E8] mb-2">FLYER IMAGE</div>
                    <img
                      src={formData.flyer_preview}
                      alt="Flyer"
                      className="w-48 h-60 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>

              <div className="bg-accent/10 border border-accent/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">ℹ️</span>
                  <div className="text-sm">
                    <strong className="block mb-1">Your event will be submitted for review</strong>
                    Our team will review your event within 24 hours. You'll receive an email once it's approved and published.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={prevStep}
            disabled={stepIndex === 0}
            className="px-6 py-3 border-2 border-border rounded-full font-semibold hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Back
          </button>

          {currentStep === 'review' ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-8 py-3 bg-accent text-background rounded-full font-bold hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Event for Review'}
            </button>
          ) : (
            <button
              type="button"
              onClick={nextStep}
              className="px-8 py-3 bg-accent text-background rounded-full font-bold hover:bg-accent/90 transition-colors"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function CreateEventPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#59FFA0] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CreateEventForm />
    </Suspense>
  );
}