# Tripboard

The Tripboard presents and organizes the shared travel plan across its main areas.

## Language

**Trip Section**:
One of the three primary areas of the Tripboard: Transport, Stay, or Agenda. A **Trip Section** contains an ordered collection of **Content Blocks**.

**Content Block**:
The primary movable unit of trip information within a **Trip Section**. Content Blocks form a gap-free flowing layout and collapse into the same logical reading order on narrow screens.
_Avoid_: Container, card

**Cover Image**:
A publicly visible image that visually presents a **Content Block**, **Place**, or **Food Option**.
_Avoid_: Attachment

**Place**:
An ordered Agenda destination or activity. A Place may have a public Cover Image, optional Maps and Website Links, a comment, and a visual Priority.
_Avoid_: Event, venue card

**Food Option**:
One candidate within an Agenda day's Breakfast, Lunch, or Dinner group. Each group may contain multiple ordered Food Options with independent Cover Images, links, and Priority.
_Avoid_: Meal string

**Priority**:
The High, Medium, or Low visual importance assigned to a Place or Food Option. Priority never changes the user-defined order.
_Avoid_: Automatic rank, sort order

**Maps Link**:
An optional public HTTP(S) destination for directions or a map location. Its location icon appears only when the URL is safe to open.
_Avoid_: Website link

**Website Link**:
An optional public HTTP(S) destination for the Place or Food Option's own website. Its external-link icon appears only when the URL is safe to open.
_Avoid_: Maps link

**Attachment**:
A protected supporting file owned by exactly one **Content Block**. Its identity, metadata, and contents are available only to someone who has unlocked the Tripboard; it is not inherited by a duplicate and is permanently removed with its owner.
_Avoid_: Cover image, media

**Attachment Preview**:
An authenticated browser view of a supported **Attachment**. Preview availability does not determine whether an Attachment may be stored or downloaded.
_Avoid_: Public link

## Example dialogue

> **Trip planner:** Move the Snowland Content Block before the arrival day in the Agenda Trip Section.
>
> **Developer:** That will also place it earlier in the single-column mobile reading order.
>
> **Trip planner:** Add the booking confirmation as an Attachment, but keep the destination photo as the Cover Image.
>
> **Developer:** Locked visitors will see the protected Attachment placeholder without learning the file name or type.
>
> **Trip planner:** This PDF supports an Attachment Preview, but the archive is download-only.
>
> **Trip planner:** Mark Snowland High Priority, keep it in its current position, and add separate Maps and Website Links.
>
> **Developer:** The Priority color changes, but the Place order remains exactly as you arranged it.
