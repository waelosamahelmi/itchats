import { Controller, Get, Param, Res, Inject } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { PostsService } from './posts.service';

/**
 * Handles /p/:postId for social crawlers (nginx proxies /p/ → backend).
 * Returns HTML with Open Graph meta tags for social previews.
 */
@Controller('p')
export class SocialShareController {
  constructor(
    @Inject(PostsService) private readonly postsService: PostsService,
  ) {}

  @Get(':postId')
  async getPostOgHtml(@Param('postId') postId: string, @Res() reply: FastifyReply) {
    const post = await this.postsService.getPostById(postId);
    if (!post) {
      return reply.status(404).type('text/html').send(
        '<!DOCTYPE html><html><body><h1>Post not found</h1></body></html>',
      );
    }

    const authorName = post.authorName || 'Unknown';
    const title = `${authorName} on itChats`;
    const description = (post.content || '').slice(0, 200).replace(/"/g, '&quot;');
    const siteUrl = process.env.PUBLIC_URL || 'https://itchats.ai';
    const postUrl = `${siteUrl}/p/${postId}`;

    // Use post media or a generated social card image
    const ogImage =
      post.mediaUrl ||
      post.thumbnailUrl ||
      `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(authorName)}&backgroundColor=b6e3f4,c0aede,d1d4f9&size=600`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${ogImage}">
<meta property="og:url" content="${postUrl}">
<meta property="og:site_name" content="itChats">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${ogImage}">
<meta name="robots" content="max-image-preview:large">
<link rel="canonical" href="${postUrl}">
</head>
<body style="font-family:system-ui;padding:2rem;text-align:center;background:#08080f;color:#f0f0f0">
<div style="max-width:600px;margin:auto;border-radius:16px;background:rgba(255,255,255,0.05);padding:2rem">
${post.mediaUrl ? `<img src="${post.mediaUrl}" alt="" style="max-width:100%;border-radius:12px;margin-bottom:1rem">` : ''}
<h1>${authorName}</h1>
<p style="opacity:0.8">${description}</p>
<p><a href="${postUrl}" style="color:#ec4899">View on itChats</a></p>
</div>
</body>
</html>`;

    return reply.type('text/html').send(html);
  }
}
