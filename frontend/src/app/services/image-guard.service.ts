import { Injectable } from '@angular/core';
import * as nsfwjs from 'nsfwjs';
import * as tf from '@tensorflow/tfjs';

export type ValidationResult = 'SAFE' | 'UNSAFE' | 'UNCERTAIN';

export interface ImageValidation {
  result: ValidationResult;
  message: string;
  predictions?: nsfwjs.PredictionType[];
}

@Injectable({
  providedIn: 'root'
})
export class ImageGuardService {
  private model: nsfwjs.NSFWJS | null = null;
  private modelLoading: Promise<void> | null = null;

  constructor() {
    this.initializeModel();
  }

  private async initializeModel(): Promise<void> {
    if (this.modelLoading) return this.modelLoading;

    this.modelLoading = (async () => {
      try {
        // Enable production mode for performance
        tf.enableProdMode();
        
        // Load the NSFW model (Singleton pattern)
        this.model = await nsfwjs.load();
        console.log('NSFW.js model loaded successfully');
      } catch (error) {
        console.error('Failed to load NSFW.js model:', error);
        this.model = null;
      }
    })();

    return this.modelLoading;
  }

  /**
   * Validate an external image URL using NSFW.js
   * Handles CORS gracefully with three states: SAFE, UNSAFE, UNCERTAIN
   */
  async validateLink(url: string): Promise<ImageValidation> {
    // Ensure model is loaded
    if (!this.model) {
      await this.initializeModel();
      if (!this.model) {
        return {
          result: 'UNCERTAIN',
          message: 'AI model not available. Image will be verified by backend.'
        };
      }
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      // Timeout to prevent hanging
      const timeout = setTimeout(() => {
        resolve({
          result: 'UNCERTAIN',
          message: 'Your picture could not be scanned. You can post your ad, but it will go through our backend AI model for deeper analysis; your post may be flagged if it violates terms.'
        });
      }, 10000); // 10 second timeout

      img.onload = async () => {
        clearTimeout(timeout);
        try {
          // Run NSFW classification
          const predictions = await this.model!.classify(img);
          
          // Check for NSFW content
          const pornScore = predictions.find(p => p.className === 'Porn')?.probability || 0;
          const sexyScore = predictions.find(p => p.className === 'Sexy')?.probability || 0;
          const hentaiScore = predictions.find(p => p.className === 'Hentai')?.probability || 0;

          const maxNsfwScore = Math.max(pornScore, sexyScore, hentaiScore);

          if (maxNsfwScore > 0.7) {
            resolve({
              result: 'UNSAFE',
              message: 'Your picture is not safe. You are not allowed to use this image for an Ad.',
              predictions
            });
          } else {
            resolve({
              result: 'SAFE',
              message: 'Your picture is safe!',
              predictions
            });
          }
        } catch (error) {
          console.error('Error classifying image:', error);
          resolve({
            result: 'UNCERTAIN',
            message: 'Your picture could not be scanned. You can post your ad, but it will go through our backend AI model for deeper analysis; your post may be flagged if it violates terms.'
          });
        }
      };

      img.onerror = () => {
        clearTimeout(timeout);
        resolve({
          result: 'UNCERTAIN',
          message: 'Your picture could not be scanned. You can post your ad, but it will go through our backend AI model for deeper analysis; your post may be flagged if it violates terms.'
        });
      };

      // Start loading the image
      img.src = url;
    });
  }

  /**
   * Cleanup TensorFlow resources
   */
  dispose(): void {
    if (this.model) {
      // Dispose of the model to free memory
      tf.disposeVariables();
    }
  }
}
