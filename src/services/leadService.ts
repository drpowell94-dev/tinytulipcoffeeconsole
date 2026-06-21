import { supabase, isSupabaseEnabled } from "./supabase";
import { isValidEmail, isValidISODate, isValidLocation, isValidPositiveNumber } from "@/lib/validators";

export interface LeadBookingPayload {
  leadId: string; // External form submission UUID
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  eventDate: string; // ISO date string
  location: string; // "1532 East Blvd, City, ST 12345"
  guestCount: number;
  eventType?: "catering" | "popup" | "farmers_market" | "other";
  specialNotes?: string;
}

export interface LeadEventResponse {
  success: boolean;
  eventId: string;
  status: string;
  message: string;
}

export interface LeadMetrics {
  totalLeads: number;
  pendingLeads: number;
  convertedLeads: number;
  conversionRate: number;
  averageLeadValue: number;
}

/**
 * Extract zip code from location string.
 * Expects format: "Street, City, ST ZIPCODE"
 */
function extractZipCode(location: string): string | null {
  const match = location.match(/(\d{5})(?:-\d{4})?$/);
  return match ? match[1] : null;
}

/**
 * Validate lead booking payload.
 * Returns { valid: boolean, errors: string[] }
 */
export function validateLeadPayload(payload: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!payload.leadId || typeof payload.leadId !== "string" || payload.leadId.length > 500) {
    errors.push("leadId is required and must be a valid string");
  }

  if (!payload.clientName || typeof payload.clientName !== "string" || payload.clientName.length > 200) {
    errors.push("clientName is required and must be a valid string");
  }

  if (!isValidEmail(payload.clientEmail)) {
    errors.push("Valid clientEmail is required");
  }

  if (!isValidISODate(payload.eventDate)) {
    errors.push("eventDate must be a valid ISO date string");
  }

  if (!isValidLocation(payload.location)) {
    errors.push("location is required and must be valid");
  }

  if (!isValidPositiveNumber(payload.guestCount)) {
    errors.push("guestCount is required and must be a positive number");
  }

  if (payload.clientPhone && typeof payload.clientPhone === "string" && payload.clientPhone.length > 20) {
    errors.push("clientPhone must be valid");
  }

  if (payload.specialNotes && typeof payload.specialNotes === "string" && payload.specialNotes.length > 1000) {
    errors.push("specialNotes must be less than 1000 characters");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a new lead event in Supabase.
 * This creates an event record with status='inquiry' and source_lead_form set.
 */
export async function createLeadEvent(
  payload: LeadBookingPayload
): Promise<LeadEventResponse> {
  // Validate input
  const validation = validateLeadPayload(payload);
  if (!validation.valid) {
    return {
      success: false,
      eventId: "",
      status: "validation_failed",
      message: `Validation failed: ${validation.errors.join(", ")}`,
    };
  }

  if (!isSupabaseEnabled || !supabase) {
    return {
      success: false,
      eventId: "",
      status: "db_unavailable",
      message: "Database connection not available",
    };
  }

  try {
    const zipCode = extractZipCode(payload.location);

    // Parse event date
    const eventDate = new Date(payload.eventDate);
    if (isNaN(eventDate.getTime())) {
      return {
        success: false,
        eventId: "",
        status: "invalid_date",
        message: "Event date could not be parsed",
      };
    }

    // Create event record
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .insert([
        {
          name: `Catering Request - ${payload.clientName}`,
          event_type: payload.eventType ?? "catering",
          date_start: eventDate.toISOString(),
          location: payload.location,
          guest_count: payload.guestCount,
          estimated_guest_count: payload.guestCount,
          status: "inquiry",
          source_lead_form: "wix_website",
          lead_uuid: payload.leadId,
          client_notes: payload.specialNotes ?? null,
          deposit_status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select();

    if (eventError || !eventData || eventData.length === 0) {
      console.error("Event creation error:", eventError);
      return {
        success: false,
        eventId: "",
        status: "insert_failed",
        message: `Failed to create event: ${eventError?.message ?? "Unknown error"}`,
      };
    }

    const eventId = eventData[0].id;

    // Create event contact record
    const { error: contactError } = await supabase
      .from("event_contacts")
      .insert([
        {
          event_id: eventId,
          contact_name: payload.clientName,
          contact_email: payload.clientEmail,
          contact_phone: payload.clientPhone ?? null,
          zip_code: zipCode,
          city: payload.location.split(",")[1]?.trim() ?? null,
          is_primary: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

    if (contactError) {
      console.error("Contact creation warning:", contactError);
      // Don't fail entirely if contact fails, event is already created
    }

    // Log activity
    const { error: logError } = await supabase.from("activity_log").insert([
      {
        action: "LEAD_CREATED",
        entity_type: "event",
        entity_id: eventId,
        changes: {
          source: "api",
          lead_id: payload.leadId,
          client_name: payload.clientName,
          client_email: payload.clientEmail,
        },
        created_at: new Date().toISOString(),
      },
    ]);

    if (logError) {
      console.warn("Activity log error:", logError);
      // Don't fail if logging fails
    }

    return {
      success: true,
      eventId,
      status: "inquiry",
      message: `Lead event created successfully. Event ID: ${eventId}`,
    };
  } catch (error) {
    console.error("Unexpected error in createLeadEvent:", error);
    return {
      success: false,
      eventId: "",
      status: "error",
      message: `Unexpected error: ${error instanceof Error ? error.message : "Unknown"}`,
    };
  }
}

/**
 * Get lead intake metrics (total, pending, converted, conversion rate).
 */
export async function getLeadMetrics(): Promise<LeadMetrics | null> {
  if (!isSupabaseEnabled || !supabase) return null;

  try {
    // Count total leads
    const { count: totalCount, error: totalError } = await supabase
      .from("events")
      .select("id", { count: "exact" })
      .eq("source_lead_form", "wix_website");

    // Count pending leads
    const { count: pendingCount, error: pendingError } = await supabase
      .from("events")
      .select("id", { count: "exact" })
      .eq("source_lead_form", "wix_website")
      .eq("status", "inquiry");

    // Count converted leads (inquiry -> confirmed or completed)
    const { count: convertedCount, error: convertedError } = await supabase
      .from("events")
      .select("id", { count: "exact" })
      .eq("source_lead_form", "wix_website")
      .in("status", ["confirmed", "completed"]);

    // Calculate average lead value
    const { data: leadRevenue, error: revenueError } = await supabase
      .from("events")
      .select("estimated_revenue")
      .eq("source_lead_form", "wix_website")
      .not("estimated_revenue", "is", null);

    if (totalError || pendingError || convertedError || revenueError) {
      console.error("Lead metrics query error");
      return null;
    }

    const total = totalCount ?? 0;
    const pending = pendingCount ?? 0;
    const converted = convertedCount ?? 0;
    const avgRevenue =
      leadRevenue && leadRevenue.length > 0
        ? leadRevenue.reduce((sum, e) => sum + (e.estimated_revenue ?? 0), 0) /
          leadRevenue.length
        : 0;

    return {
      totalLeads: total,
      pendingLeads: pending,
      convertedLeads: converted,
      conversionRate: total > 0 ? (converted / total) * 100 : 0,
      averageLeadValue: avgRevenue,
    };
  } catch (error) {
    console.error("Unexpected error in getLeadMetrics:", error);
    return null;
  }
}

/**
 * Queue a confirmation email to the lead.
 * (Mock function - integrate with email service like SendGrid, AWS SES, etc.)
 */
export async function queueLeadConfirmationEmail(
  email: string,
  clientName: string,
  eventDate: string
): Promise<{ queued: boolean; messageId?: string }> {
  // This is a mock implementation
  // In production, integrate with SendGrid, AWS SES, Resend, or similar
  console.log(`[EMAIL QUEUE] Confirmation email to ${email} for ${clientName}`);

  // Example structure for real implementation:
  // const result = await sendgrid.send({
  //   to: email,
  //   from: 'booking@tinytulipcoffee.com',
  //   subject: 'Your Catering Request Received',
  //   html: `<p>Hi ${clientName},</p><p>We received your catering request for ${eventDate}. We'll follow up soon!</p>`,
  // });

  return {
    queued: true,
    messageId: `mock-${Date.now()}`,
  };
}

/**
 * Convert a pending lead (inquiry) to a confirmed booking.
 * Called when the team decides to move forward with the lead.
 */
export async function convertLeadToBooking(
  eventId: string,
  deposit?: number,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseEnabled || !supabase) {
    return {
      success: false,
      message: "Database not available",
    };
  }

  try {
    const { error } = await supabase
      .from("events")
      .update({
        status: "confirmed",
        deposit_amount: deposit ?? null,
        notes: notes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId);

    if (error) {
      return {
        success: false,
        message: `Failed to convert lead: ${error.message}`,
      };
    }

    // Log activity
    await supabase.from("activity_log").insert([
      {
        action: "LEAD_CONVERTED",
        entity_type: "event",
        entity_id: eventId,
        changes: { status_change: "inquiry -> confirmed" },
        created_at: new Date().toISOString(),
      },
    ]);

    return {
      success: true,
      message: "Lead converted to confirmed booking",
    };
  } catch (error) {
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : "Unknown"}`,
    };
  }
}
