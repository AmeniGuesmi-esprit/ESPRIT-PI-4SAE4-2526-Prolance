import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { ForumListComponent } from './components/forum-list/forum-list.component';
import { PublicationFormComponent } from './components/publication-form/publication-form.component';
import { CommentaireModalComponent } from './components/commentaire-modal/commentaire-modal.component';
import { ReactionButtonComponent } from './components/reaction-button/reaction-button.component';
import { ChatbotComponent } from './components/chatbot/chatbot.component';
import { SignalementModalComponent } from './components/signalement-modal/signalement-modal.component';

import { PublicationService } from './services/publication.service';
import { CommentaireService } from './services/commentaire.service';
import { ReactionService } from './services/reaction.service';

import { GestionForumRoutingModule } from './gestion-forum-routing.module';

@NgModule({
  declarations: [
    ForumListComponent,
    PublicationFormComponent,
    CommentaireModalComponent,
    ReactionButtonComponent,
    ChatbotComponent,        // ✅
    SignalementModalComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    GestionForumRoutingModule
  ],
  providers: [
    PublicationService,
    CommentaireService,
    ReactionService
  ],
  exports: [
    ForumListComponent
  ]
})
export class GestionForumModule { }