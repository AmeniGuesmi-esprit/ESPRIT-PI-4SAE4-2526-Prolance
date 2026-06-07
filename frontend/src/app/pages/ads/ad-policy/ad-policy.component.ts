import { Component } from '@angular/core';
import { Location } from '@angular/common';

export interface PolicyCategory {
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
}

@Component({
  selector: 'app-ad-policy',
  templateUrl: './ad-policy.component.html',
  styleUrls: ['./ad-policy.component.scss']
})
export class AdPolicyComponent {

  constructor(private location: Location) {}

  readonly llamaGuardCategories: PolicyCategory[] = [
    {
      code: 'S1',
      name: 'Violent Crimes',
      description: 'Content promoting or describing violent criminal activities including assault, murder, kidnapping, or any form of physical harm.',
      icon: 'dangerous'
    },
    {
      code: 'S2',
      name: 'Non-Violent Crimes',
      description: 'Content related to theft, fraud, tax evasion, vandalism, or other criminal activities that don\'t involve physical violence.',
      icon: 'gavel'
    },
    {
      code: 'S3',
      name: 'Sex-Related Crimes',
      description: 'Content involving sexual abuse, trafficking, exploitation, or any non-consensual sexual activities.',
      icon: 'block'
    },
    {
      code: 'S4',
      name: 'Child Sexual Exploitation',
      description: 'Any content that sexualizes, exploits, or endangers minors in any form. Zero tolerance policy.',
      icon: 'child_care'
    },
    {
      code: 'S5',
      name: 'Defamation',
      description: 'False statements that damage the reputation of individuals or organizations without factual basis.',
      icon: 'report'
    },
    {
      code: 'S6',
      name: 'Specialized Advice',
      description: 'Unauthorized medical, legal, or financial advice that could cause harm when provided without proper credentials.',
      icon: 'health_and_safety'
    },
    {
      code: 'S7',
      name: 'Privacy Violations',
      description: 'Sharing personal information, doxxing, or violating individuals\' privacy rights without consent.',
      icon: 'privacy_tip'
    },
    {
      code: 'S8',
      name: 'Intellectual Property',
      description: 'Unauthorized use, distribution, or promotion of copyrighted materials, trademarks, or patents.',
      icon: 'copyright'
    },
    {
      code: 'S9',
      name: 'Indiscriminate Weapons',
      description: 'Content promoting, selling, or describing the creation of weapons including chemical, biological, radiological, or nuclear materials.',
      icon: 'warning'
    },
    {
      code: 'S10',
      name: 'Hate Speech',
      description: 'Content promoting hatred, discrimination, or violence against individuals or groups based on race, religion, gender, or other protected characteristics.',
      icon: 'not_interested'
    },
    {
      code: 'S11',
      name: 'Suicide & Self-Harm',
      description: 'Content encouraging or providing instructions for suicide, self-injury, or eating disorders.',
      icon: 'healing'
    },
    {
      code: 'S12',
      name: 'Sexual Content',
      description: 'Explicit sexual content, pornography, or overly sexualized material inappropriate for a professional platform.',
      icon: 'no_adult_content'
    },
    {
      code: 'S13',
      name: 'Elections & Misinformation',
      description: 'False information about voting procedures, election fraud claims, or content designed to suppress voter participation.',
      icon: 'how_to_vote'
    },
    {
      code: 'S14',
      name: 'Code Interpreter Abuse',
      description: 'Malicious code, scripts, or commands designed to exploit systems, steal data, or cause harm.',
      icon: 'code_off'
    }
  ];

  goBack(): void {
    this.location.back();
  }
}
