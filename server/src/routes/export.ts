import { Router } from 'express';
import { PrismaClient, Comment } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getSignedUrl } from '../services/s3';
import puppeteer from 'puppeteer';

const router = Router();
const prisma = new PrismaClient();

interface CommentWithUser extends Comment {
  user: { name: string };
  replies: Array<Comment & { user: { name: string } }>;
}

// Export contract as annotated PDF
router.post('/:contractId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { contractId } = req.params;
    const { includeComments = true } = req.body;

    // Check access
    const contract = await prisma.contract.findFirst({
      where: {
        id: contractId,
        OR: [
          { ownerId: req.user!.id },
          { permissions: { some: { userId: req.user!.id } } }
        ]
      },
      include: {
        comments: {
          where: { parentId: null },
          include: {
            user: { select: { name: true } },
            replies: {
              include: { user: { select: { name: true } } }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found or access denied' });
    }

    // Get PDF URL
    const pdfUrl = await getSignedUrl(contract.s3Key);

    // Generate HTML for export
    const commentsHtml = includeComments && contract.comments.length > 0
      ? `
        <div class="comments-section">
          <h2>Comments</h2>
          ${(contract.comments as unknown as CommentWithUser[]).map((c: CommentWithUser) => `
            <div class="comment ${c.resolved ? 'resolved' : ''}">
              <div class="comment-header">
                <strong>${c.user.name}</strong>
                <span class="date">${new Date(c.createdAt).toLocaleDateString()}</span>
                ${c.resolved ? '<span class="badge">Resolved</span>' : ''}
              </div>
              <p>${c.content}</p>
              ${c.replies.length > 0 ? `
                <div class="replies">
                  ${c.replies.map((r: CommentWithUser['replies'][0]) => `
                    <div class="reply">
                      <strong>${r.user.name}</strong>: ${r.content}
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `
      : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${contract.title} - Export</title>
        <style>
          body {
            font-family: 'Inter', system-ui, sans-serif;
            margin: 0;
            padding: 40px;
            background: #f8f9fa;
          }
          .header {
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e9ecef;
          }
          .header h1 {
            margin: 0 0 8px;
            color: #1a1a1a;
            font-size: 24px;
          }
          .header .meta {
            color: #6c757d;
            font-size: 14px;
          }
          .pdf-embed {
            width: 100%;
            height: 800px;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          .comments-section {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .comments-section h2 {
            margin-top: 0;
            color: #1a1a1a;
            font-size: 18px;
            margin-bottom: 20px;
          }
          .comment {
            padding: 16px;
            background: #f8f9fa;
            border-radius: 8px;
            margin-bottom: 12px;
          }
          .comment.resolved {
            opacity: 0.6;
          }
          .comment-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 8px;
          }
          .comment-header .date {
            color: #6c757d;
            font-size: 12px;
          }
          .badge {
            background: #28a745;
            color: white;
            font-size: 10px;
            padding: 2px 8px;
            border-radius: 10px;
          }
          .replies {
            margin-top: 12px;
            padding-left: 20px;
            border-left: 2px solid #dee2e6;
          }
          .reply {
            font-size: 14px;
            color: #495057;
            margin-bottom: 8px;
          }
          @media print {
            body { padding: 20px; }
            .pdf-embed { height: 600px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${contract.title}</h1>
          <div class="meta">
            Exported on ${new Date().toLocaleDateString()} • 
            Version ${contract.version} •
            ${contract.comments.length} comments
          </div>
        </div>
        
        <iframe class="pdf-embed" src="${pdfUrl}"></iframe>
        
        ${commentsHtml}
      </body>
      </html>
    `;

    // Launch Puppeteer and generate PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
    });

    await browser.close();

    // Set headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${contract.title}-annotated.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export contract' });
  }
});

// Export comments as JSON
router.get('/:contractId/comments', authenticate, async (req: AuthRequest, res) => {
  try {
    const { contractId } = req.params;

    const contract = await prisma.contract.findFirst({
      where: {
        id: contractId,
        OR: [
          { ownerId: req.user!.id },
          { permissions: { some: { userId: req.user!.id } } }
        ]
      },
      include: {
        comments: {
          include: {
            user: { select: { name: true, email: true } },
            replies: {
              include: { user: { select: { name: true, email: true } } }
            }
          }
        }
      }
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const exportData = {
      contractId: contract.id,
      contractTitle: contract.title,
      version: contract.version,
      exportedAt: new Date().toISOString(),
      comments: (contract.comments as unknown as CommentWithUser[]).map((c: CommentWithUser) => ({
        id: c.id,
        author: c.user.name,
        content: c.content,
        resolved: c.resolved,
        createdAt: c.createdAt,
        replies: c.replies.map((r: CommentWithUser['replies'][0]) => ({
          author: r.user.name,
          content: r.content,
          createdAt: r.createdAt,
        }))
      }))
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${contract.title}-comments.json"`);
    res.json(exportData);

  } catch (error) {
    console.error('Export comments error:', error);
    res.status(500).json({ error: 'Failed to export comments' });
  }
});

export default router;
