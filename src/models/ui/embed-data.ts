export class EmbedData {
    content: string;
    title?: string;
    image?: string;
    footer?: string;
    authorName?: string;
    authorIcon?: string;

    constructor(
        content: string,
        title?: string,
        image?: string,
        footer?: string,
        authorName?: string,
        authorIcon?: string
    ) {
        this.content = content;
        this.title = title;
        this.image = image;
        this.footer = footer;
        this.authorName = authorName;
        this.authorIcon = authorIcon;
    }
}
