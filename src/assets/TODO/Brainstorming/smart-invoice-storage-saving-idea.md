# Implementation Task: Image-Based Invoice Storage & On-Demand PDF Generation

## Project Context

We want to optimize permanent document storage for Crafti Nagma by storing invoices as high-quality PNG images in ImageKit instead of storing PDF files.

When an admin or customer requests an invoice download, the backend should retrieve the stored PNG from ImageKit, convert it into a PDF dynamically, and stream the resulting PDF to the requester.

The goal is to reduce ImageKit storage consumption while retaining permanently accessible, downloadable invoices.

## 1. Core Architecture

Implement the following workflow:

1. When an invoice is officially issued, generate a high-resolution PNG invoice.
2. Upload that PNG to ImageKit using the existing server-side ImageKit integration.
3. Store its ImageKit file ID, file path, URL/reference and relevant metadata in the database.
4. Preserve an immutable snapshot of the invoice data in MySQL.
5. When an invoice download is requested:
   - Authenticate the requester.
   - Authorize access to the specific invoice.
   - Retrieve the original PNG from ImageKit.
   - Convert the image into a valid PDF server-side.
   - Stream the PDF as an attachment with the correct filename.
6. Do not permanently upload or store the generated PDF in ImageKit.

## 2. Invoice Image Generation

- Use PNG as the preferred image format.
- Ensure high-resolution, print-friendly output.
- Preserve text sharpness, tables, borders, spacing and numerical accuracy.
- Support variable invoice lengths and multiple pages.
- Maintain consistent invoice branding, company details and layout.
- Avoid cropping, scaling distortion and unreadable text.
- Ensure that multi-page invoices are converted into correctly ordered PDF pages.

## 3. Immutable Invoice Snapshots

An issued invoice must never change because someone subsequently modifies:

- Product title or description.
- Variant options or SKU.
- Customer details.
- Product prices.
- Discounts.
- GST configuration.
- Company profile details.

Store all relevant invoice information as an immutable snapshot when the invoice is issued.

The stored PNG and structured invoice snapshot must represent the same issued document.

Do not regenerate an already-issued invoice using mutable catalogue data.

## 4. On-Demand PDF Generation

Create a reusable server-side PDF conversion utility.

Requirements:

- Retrieve the original image securely.
- Convert PNG into a valid PDF.
- Preserve image aspect ratio.
- Use appropriate page dimensions.
- Support multiple invoice pages.
- Set the correct PDF filename.
- Return the PDF using an appropriate `Content-Type` and `Content-Disposition` header.
- Stream the result instead of permanently storing it.
- Clean up any temporary resources.

Avoid unnecessary ImageKit transformations or duplicate image uploads.

## 5. Access Control

Support both customer and admin downloads.

**Customer:**

- Can only download invoices belonging to their own orders.
- Cannot access another customer's invoice by changing an ID or URL.

**Admin:**

- Can download invoices according to existing admin permissions.
- Should be able to access historical invoices even when their associated products are archived or deleted from the active catalogue.

Use existing authentication, authorization and API conventions.

## 6. Storage & Database

Before implementing anything, inspect the existing:

- `imagekit_files` table.
- Invoice/document-related tables.
- Existing invoice generation utilities.
- ImageKit upload and private-file retrieval implementation.
- Existing order and invoice relationships.

Reuse the existing infrastructure wherever possible.

Do not introduce duplicate storage tables or redundant ImageKit records without justification.

Maintain a clear relationship between each issued invoice and its original stored image.

## 7. Reliability & Edge Cases

Handle:

- ImageKit retrieval failures.
- Missing or inaccessible invoice images.
- Invalid image formats.
- PDF conversion failures.
- Multi-page invoices.
- Large invoice files.
- Duplicate invoice generation requests.
- Concurrent download requests.
- Unauthorized access.
- Historical invoices associated with archived products.

Do not silently generate a replacement invoice if the original issued document is missing. Report the problem and preserve the audit trail.

## 8. Security

- Keep ImageKit private-file access server-side.
- Never expose private credentials or unrestricted file access.
- Validate invoice ownership and permissions on every download request.
- Prevent arbitrary ImageKit file retrieval through user-controlled paths.
- Do not trust invoice IDs supplied by the client without authorization checks.

## 9. Performance

- Avoid unnecessary image downloads and repeated conversions within a single request.
- Use streaming where practical.
- Avoid introducing permanent PDF storage.
- Consider reasonable request-size limits and conversion timeouts.
- Do not compromise invoice quality for storage savings.

## 10. Future Compatibility

Design the pipeline so the same architecture can eventually support:

- GST invoices.
- Credit notes.
- Refund documents.
- Other financial documents.

Each document type should have its own appropriate template and immutable issued-document snapshot.

## 11. Implementation Instructions

Before making changes:

1. Inspect the complete existing invoice/document architecture.
2. Understand the existing ImageKit integration and database relationships.
3. Identify reusable utilities and existing conventions.
4. Propose the minimum necessary database changes.
5. Explain the implementation plan and any potential migration requirements.

Then implement the solution with minimal, well-structured changes.

Do not rewrite unrelated modules or introduce unnecessary dependencies.

Follow the existing Next.js App Router, TypeScript, raw MySQL and ImageKit conventions used in this repository.

**Important:** The objective is not simply to convert images into PDFs. It is to establish a reliable, immutable, secure financial-document storage pipeline that minimizes permanent storage consumption without sacrificing historical invoice accessibility or document integrity.
