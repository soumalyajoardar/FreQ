package com.gresseymusic.wave.ui.components

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.Icons
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.Dp
import com.gresseymusic.wave.data.library.LocalLibraryRepositoryProvider
import com.gresseymusic.wave.player.MediaTrack
import com.gresseymusic.wave.ui.components.AddToPlaylistDialog
import com.gresseymusic.wave.ui.components.ArtPlaceholder
import com.gresseymusic.wave.ui.components.CreatePlaylistDialog
import com.gresseymusic.wave.ui.theme.FreqShapes
import com.gresseymusic.wave.ui.theme.FreqSpacing
import com.gresseymusic.wave.ui.theme.FreqTheme
import com.gresseymusic.wave.ui.theme.Typography
import kotlinx.coroutines.launch














@Composable
fun AddToPlaylistDialog(
    track: MediaTrack,
    onDismiss: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val libraryRepository = LocalLibraryRepositoryProvider.current
    val userPlaylists by libraryRepository.userPlaylists.collectAsState()

    var showCreateDialog by remember { mutableStateOf(false) }

    if (showCreateDialog) {
        CreatePlaylistDialog(
            onDismiss = { showCreateDialog = false },
            onPlaylistCreated = { newPlId ->
                scope.launch {
                    val added = libraryRepository.addTrackToPlaylist(newPlId, track)
                    if (added) {
                        Toast.makeText(context, "Added to playlist", Toast.LENGTH_SHORT).show()
                        onDismiss()
                    }
                }
            },
        )
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Column {
                Text(
                    text = "Add to Playlist",
                    style = Typography.titleLarge,
                    color = FreqTheme.colors.textPrimary,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = track.title,
                    style = Typography.bodySmall,
                    color = FreqTheme.colors.textSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 300.dp),
                verticalArrangement = Arrangement.spacedBy(FreqSpacing.sm),
            ) {
                // "+ Create New Playlist" Option
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(FreqShapes.card)
                        .background(FreqTheme.colors.glassStandard)
                        .clickable { showCreateDialog = true }
                        .padding(horizontal = FreqSpacing.md, vertical = FreqSpacing.sm),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(FreqTheme.colors.glassStrong),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = "New Playlist",
                            tint = FreqTheme.colors.textPrimary,
                            modifier = Modifier.size(20.dp),
                        )
                    }

                    Spacer(modifier = Modifier.width(FreqSpacing.md))

                    Text(
                        text = "Create New Playlist",
                        style = Typography.titleMedium,
                        color = FreqTheme.colors.textPrimary,
                        fontWeight = FontWeight.Bold,
                    )
                }

                if (userPlaylists.isNotEmpty()) {
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(FreqSpacing.xs),
                    ) {
                        items(userPlaylists, key = { it.id }) { pl ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(FreqShapes.card)
                                    .background(FreqTheme.colors.glassStandard)
                                    .clickable {
                                        scope.launch {
                                            val added = libraryRepository.addTrackToPlaylist(pl.id, track)
                                            if (added) {
                                                Toast.makeText(
                                                    context,
                                                    "Added to '${pl.title}'",
                                                    Toast.LENGTH_SHORT,
                                                ).show()
                                                onDismiss()
                                            } else {
                                                Toast.makeText(
                                                    context,
                                                    "Already in '${pl.title}'",
                                                    Toast.LENGTH_SHORT,
                                                ).show()
                                            }
                                        }
                                    }
                                    .padding(horizontal = FreqSpacing.md, vertical = FreqSpacing.sm),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                ArtPlaceholder(
                                    colors = listOf(
                                        FreqTheme.colors.textSecondary,
                                        FreqTheme.colors.textMuted,
                                    ),
                                    artworkUrl = pl.artworkUrl,
                                    shape = FreqShapes.card,
                                    iconSize = 16.dp,
                                    modifier = Modifier.size(36.dp),
                                )

                                Spacer(modifier = Modifier.width(FreqSpacing.md))

                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = pl.title,
                                        style = Typography.titleMedium,
                                        color = FreqTheme.colors.textPrimary,
                                        fontWeight = FontWeight.SemiBold,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                    Text(
                                        text = "${pl.tracks.size} tracks",
                                        style = Typography.bodySmall,
                                        color = FreqTheme.colors.textSecondary,
                                    )
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = FreqTheme.colors.textSecondary)
            }
        },
        containerColor = FreqTheme.colors.surfaceElevated,
        shape = FreqShapes.cardLarge,
    )
}