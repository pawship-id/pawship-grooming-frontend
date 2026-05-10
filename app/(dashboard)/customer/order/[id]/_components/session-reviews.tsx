"use client";

import { useState } from "react";
import { Star, MessageSquare, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reviewSession, type BookingSession } from "@/lib/api/bookings";

interface SessionReviewCardProps {
  bookingId: string;
  session: BookingSession;
  onReviewSubmitted: () => void;
}

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110 focus:outline-none"
        >
          <Star
            className="h-8 w-8"
            fill={(hovered || value) >= star ? "#f59e0b" : "none"}
            stroke={(hovered || value) >= star ? "#f59e0b" : "#d1d5db"}
          />
        </button>
      ))}
    </div>
  );
}

function SessionReviewCard({
  bookingId,
  session,
  onReviewSubmitted,
}: SessionReviewCardProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existing = session.review_customer;

  const sessionLabel =
    session.type.charAt(0).toUpperCase() + session.type.slice(1);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError("Pilih rating bintang terlebih dahulu");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await reviewSession(bookingId, session._id!, {
        rating,
        comment: comment.trim() || undefined,
      });
      onReviewSubmitted();
    } catch {
      setError("Gagal mengirim review. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground">{sessionLabel}</p>

      {existing ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
            <span className="text-xs text-muted-foreground">Review terkirim</span>
          </div>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className="h-5 w-5"
                fill={existing.rating >= s ? "#f59e0b" : "none"}
                stroke={existing.rating >= s ? "#f59e0b" : "#d1d5db"}
              />
            ))}
          </div>
          {existing.comment && (
            <p className="text-sm text-muted-foreground italic">
              &ldquo;{existing.comment}&rdquo;
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <StarRating value={rating} onChange={setRating} />

          <Textarea
            placeholder="Tulis komentar (opsional)..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="resize-none text-sm"
          />

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button
            type="submit"
            size="sm"
            disabled={submitting || rating === 0}
            className="w-full"
          >
            {submitting ? "Mengirim..." : "Kirim Review"}
          </Button>
        </form>
      )}
    </div>
  );
}

interface SessionReviewsProps {
  bookingId: string;
  sessions: BookingSession[];
  onReviewSubmitted: () => void;
}

export function SessionReviews({
  bookingId,
  sessions,
  onReviewSubmitted,
}: SessionReviewsProps) {
  if (!sessions || sessions.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          Review Sesi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Berikan penilaian untuk setiap sesi grooming. Komentar bersifat
          opsional.
        </p>
        {sessions.map((session) =>
          session._id ? (
            <SessionReviewCard
              key={session._id}
              bookingId={bookingId}
              session={session}
              onReviewSubmitted={onReviewSubmitted}
            />
          ) : null,
        )}
      </CardContent>
    </Card>
  );
}
