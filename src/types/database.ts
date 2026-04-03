export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PermissionLevel = "viewer" | "editor" | "manager";
export type TripSegmentStatus =
  | "tentative"
  | "planned"
  | "confirmed"
  | "active"
  | "completed"
  | "cancelled";
export type VisitStatus = "tentative" | "confirmed" | "cancelled";
export type LocationType =
  | "zone"
  | "island"
  | "city"
  | "airport"
  | "marina"
  | "anchorage"
  | "port"
  | "boatyard"
  | "other";
export type PlaceSource =
  | "manual"
  | "google_places"
  | "mapbox"
  | "openstreetmap"
  | "other";
export type PreferredLanguage = "es" | "en";
export type SignInMethod = "password" | "magic_link" | "unknown";
export type SeasonAccessWindow =
  | "one_use"
  | "one_day"
  | "one_week"
  | "season_end"
  | "season_plus_7";

export interface Database {
  public: {
    Tables: {
      boats: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          model: string | null;
          year_built: number | null;
          home_port: string | null;
          notes: string | null;
          image_path: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          model?: string | null;
          year_built?: number | null;
          home_port?: string | null;
          notes?: string | null;
          image_path?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["boats"]["Insert"]>;
      };
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          email: string | null;
          is_superuser: boolean;
          onboarding_pending: boolean;
          is_guest_user: boolean;
          is_timeline_public: boolean;
          created_by_user_id: string | null;
          sign_in_count: number;
          last_sign_in_at: string | null;
          last_sign_in_method: SignInMethod | null;
          preferred_language: PreferredLanguage;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          email?: string | null;
          is_superuser?: boolean;
          onboarding_pending?: boolean;
          is_guest_user?: boolean;
          is_timeline_public?: boolean;
          created_by_user_id?: string | null;
          sign_in_count?: number;
          last_sign_in_at?: string | null;
          last_sign_in_method?: SignInMethod | null;
          preferred_language?: PreferredLanguage;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      user_boat_permissions: {
        Row: {
          id: string;
          user_id: string;
          boat_id: string;
          permission_level: PermissionLevel;
          can_edit: boolean;
          can_view_all_visits: boolean;
          can_view_visit_names: boolean;
          can_view_private_notes: boolean;
          can_view_only_own_visit: boolean;
          can_manage_boat_users: boolean;
          can_view_availability: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          boat_id: string;
          permission_level?: PermissionLevel;
          can_edit?: boolean;
          can_view_all_visits?: boolean;
          can_view_visit_names?: boolean;
          can_view_private_notes?: boolean;
          can_view_only_own_visit?: boolean;
          can_manage_boat_users?: boolean;
          can_view_availability?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_boat_permissions"]["Insert"]>;
      };
      seasons: {
        Row: {
          id: string;
          boat_id: string;
          year: number;
          start_date: string;
          end_date: string;
          name: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          boat_id: string;
          year: number;
          start_date: string;
          end_date: string;
          name: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["seasons"]["Insert"]>;
      };
      season_access_links: {
        Row: {
          id: string;
          boat_id: string;
          season_id: string;
          token_hash: string;
          invitee_name: string | null;
          created_by_user_id: string;
          created_at: string;
          expires_at: string;
          can_view_visits: boolean;
          single_use: boolean;
          redeemed_at: string | null;
          revoked_at: string | null;
          last_access_at: string | null;
          access_count: number;
        };
        Insert: {
          id?: string;
          boat_id: string;
          season_id: string;
          token_hash: string;
          invitee_name?: string | null;
          created_by_user_id: string;
          created_at?: string;
          expires_at: string;
          can_view_visits?: boolean;
          single_use?: boolean;
          redeemed_at?: string | null;
          revoked_at?: string | null;
          last_access_at?: string | null;
          access_count?: number;
        };
        Update: Partial<Database["public"]["Tables"]["season_access_links"]["Insert"]>;
      };
      trip_segments: {
        Row: {
          id: string;
          season_id: string;
          sort_order: number;
          start_date: string;
          end_date: string;
          location_label: string;
          location_type: LocationType;
          place_source: PlaceSource;
          external_place_id: string | null;
          latitude: number | null;
          longitude: number | null;
          status: TripSegmentStatus;
          public_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          sort_order?: number;
          start_date: string;
          end_date: string;
          location_label: string;
          location_type?: LocationType;
          place_source?: PlaceSource;
          external_place_id?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          status?: TripSegmentStatus;
          public_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["trip_segments"]["Insert"]>;
      };
      trip_segment_private_notes: {
        Row: {
          trip_segment_id: string;
          private_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          trip_segment_id: string;
          private_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["trip_segment_private_notes"]["Insert"]>;
      };
      visits: {
        Row: {
          id: string;
          season_id: string;
          owner_user_id: string | null;
          visitor_name: string;
          embark_date: string;
          disembark_date: string;
          embark_place_label: string | null;
          embark_place_source: PlaceSource;
          embark_external_place_id: string | null;
          embark_latitude: number | null;
          embark_longitude: number | null;
          disembark_place_label: string | null;
          disembark_place_source: PlaceSource;
          disembark_external_place_id: string | null;
          disembark_latitude: number | null;
          disembark_longitude: number | null;
          status: VisitStatus;
          public_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          owner_user_id?: string | null;
          visitor_name: string;
          embark_date: string;
          disembark_date: string;
          embark_place_label?: string | null;
          embark_place_source?: PlaceSource;
          embark_external_place_id?: string | null;
          embark_latitude?: number | null;
          embark_longitude?: number | null;
          disembark_place_label?: string | null;
          disembark_place_source?: PlaceSource;
          disembark_external_place_id?: string | null;
          disembark_latitude?: number | null;
          disembark_longitude?: number | null;
          status?: VisitStatus;
          public_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["visits"]["Insert"]>;
      };
      visit_private_notes: {
        Row: {
          visit_id: string;
          private_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          visit_id: string;
          private_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["visit_private_notes"]["Insert"]>;
      };
    };
    Views: {
      boat_access_overview: {
        Row: {
          boat_id: string;
          boat_name: string;
          permission_level: PermissionLevel | null;
          can_edit: boolean | null;
          can_manage_boat_users: boolean | null;
        };
      };
    };
    Functions: {
      get_season_trip_segments: {
        Args: {
          p_season_id: string;
        };
        Returns: {
          id: string;
          season_id: string;
          sort_order: number;
          start_date: string;
          end_date: string;
          location_label: string;
          location_type: LocationType;
          place_source: PlaceSource;
          external_place_id: string | null;
          latitude: number | null;
          longitude: number | null;
          status: TripSegmentStatus;
          public_notes: string | null;
          private_notes: string | null;
          created_at: string;
          updated_at: string;
        }[];
      };
      get_season_visits: {
        Args: {
          p_season_id: string;
        };
        Returns: {
          id: string;
          season_id: string;
          owner_user_id: string | null;
          visitor_name: string | null;
          embark_date: string | null;
          disembark_date: string | null;
          embark_place_label: string | null;
          embark_latitude: number | null;
          embark_longitude: number | null;
          disembark_place_label: string | null;
          disembark_latitude: number | null;
          disembark_longitude: number | null;
          status: VisitStatus;
          public_notes: string | null;
          private_notes: string | null;
          blocks_availability: boolean;
          created_at: string;
          updated_at: string;
        }[];
      };
      record_season_access_link_hit: {
        Args: {
          p_link_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      permission_level: PermissionLevel;
      trip_segment_status: TripSegmentStatus;
      visit_status: VisitStatus;
      location_type: LocationType;
      place_source: PlaceSource;
    };
  };
}
