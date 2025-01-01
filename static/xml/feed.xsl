<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:atom="http://www.w3.org/2005/Atom"
                version="1.0">
<xsl:output method="xml"/>
<xsl:template match="/">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width"/>
<title><xsl:value-of select="atom:feed/atom:title"/> (Atom)</title>
<style><![CDATA[html{margin:0;padding:0;}body{color:font-size:1.1rem;line-height:1.4;margin:5%;max-width:35rem;padding:0;}input{min-width:35rem;margin-left:.2rem;padding-left:.2rem;padding-right:.2rem;}h2{font-size:22px;font-weight:inherit;}h3:before{content:"" !important;}]]></style>
<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
<link rel="manifest" href="/icons/site.webmanifest" />
<link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#5bbad5" />
<link rel="shortcut icon" href="/icons/favicon.ico" />
<link rel="stylesheet" href="/css/palettes/runtimeterror.css" />
<link rel="stylesheet" href="/css/risotto.css" />
<link rel="stylesheet" href="/css/custom.css" />
</head>
<body>
<h1><xsl:value-of select="atom:feed/atom:title"/> (Atom)</h1>
<p>This is an <a href="https://en.wikipedia.org/wiki/Atom_(web_standard)" title="Atom (web standard) on Wikipedia">Atom</a> feed. To subscribe to it, copy its address and paste it when your feed reader asks for it. It will be updated periodically in your reader.</p>
<p>New to feeds? <a href="https://www.mojeek.com/search?q=how+to+subscribe+to+an+atom+or+rss+feed" title="Search on the web to learn more">Learn more</a>.</p>
<p>
<label for="address">Feed address:</label>
<input><xsl:attribute name="type">url</xsl:attribute><xsl:attribute name="id">address</xsl:attribute><xsl:attribute name="spellcheck">false</xsl:attribute><xsl:attribute name="value"><xsl:value-of select="atom:feed/atom:link[@rel='self']/@href"/></xsl:attribute></input>
</p>
<p><h2>Recent posts:</h2></p>
<ul>
<xsl:for-each select="atom:feed/atom:entry">
<li>
    <h3><a><xsl:attribute name="href"><xsl:value-of select="atom:link[@rel='alternate']/@href"/></xsl:attribute><xsl:value-of select="atom:title"/></a></h3>
    <p><xsl:value-of select="atom:summary"/></p>
</li>
</xsl:for-each>
</ul>
</body>
</html>
</xsl:template>
</xsl:stylesheet>
