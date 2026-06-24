import type { Schema, Struct } from '@strapi/strapi';

export interface DefaultFightListItem extends Struct.ComponentSchema {
  collectionName: 'components_default_fight_list_items';
  info: {
    displayName: 'FightListItem';
    icon: 'bulletList';
  };
  attributes: {
    fighterA: Schema.Attribute.String;
    fighterB: Schema.Attribute.String;
    result: Schema.Attribute.String;
    weightClass: Schema.Attribute.String;
  };
}

export interface DefaultSeo extends Struct.ComponentSchema {
  collectionName: 'components_default_seos';
  info: {
    displayName: 'SEO';
    icon: 'chartCircle';
  };
  attributes: {
    keywords: Schema.Attribute.String;
    metaDescription: Schema.Attribute.Text;
    metaTitle: Schema.Attribute.String;
    ogImage: Schema.Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
  };
}

export interface DefaultWhatYouGetItem extends Struct.ComponentSchema {
  collectionName: 'components_default_what_you_get_items';
  info: {
    displayName: 'WhatYouGetItem';
    icon: 'book';
  };
  attributes: {
    item: Schema.Attribute.String;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'default.fight-list-item': DefaultFightListItem;
      'default.seo': DefaultSeo;
      'default.what-you-get-item': DefaultWhatYouGetItem;
    }
  }
}
