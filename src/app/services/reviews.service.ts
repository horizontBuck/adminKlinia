import { Injectable } from '@angular/core';
import { AuthPocketbaseService } from './auth-pocketbase.service';

@Injectable({
  providedIn: 'root'
})
export class ReviewsService {

  constructor(private auth: AuthPocketbaseService) {}

  async createReview(data: {
    rating: number;
    comment: string;
    tags: string[];
    appointment: string;
    professional: string;
    client: string;
  }) {
    return await this.auth.pb.collection('reviews').create(data);
  }

  async getReviewsByProfessional(professionalId: string) {
    return await this.auth.pb.collection('reviews').getFullList({
      filter: `professional = "${professionalId}"`,
      sort: '-created'
    });
  }

  getReviewByAppointment(appointmentId: string) {
  return this.auth.pb.collection('reviews').getFullList({
    filter: `appointment = "${appointmentId}"`,
    sort: '-created'
  });
}

  async getAllReviews() {
    return await this.auth.pb.collection('reviews').getFullList({
      sort: '-created'
    });
  }
}
